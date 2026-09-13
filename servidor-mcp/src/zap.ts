/**
 * Worker do WhatsApp — o terceiro perfil do Listinia.
 *
 * Diferente de compras.ts e mercado.ts, este NÃO é um servidor MCP e não sobe
 * o OAuthProvider: quem conversa aqui é uma pessoa pelo zap, não um cliente
 * MCP. As ferramentas são as mesmas, chamadas em memória (zap/ferramentas.ts),
 * sobre o mesmo D1. A identidade vem do telefone em vez do Google.
 */

import { processarMensagem } from "./zap/harness";
import { responder, receber, type ZapiConfig, type MensagemRecebida } from "./zap/zapi";
import type { ListiniaEnv } from "./tipos";

interface ZapEnv extends ListiniaEnv {
	ZAPI_INSTANCIA: string;
	ZAPI_TOKEN: string;
	ZAPI_CLIENT_TOKEN: string;
	/** Segredo no path do webhook. Ver o comentário na rota. */
	ZAPI_WEBHOOK_SEGREDO: string;
	/** Recurso do Microsoft Foundry que serve o modelo. */
	FOUNDRY_RESOURCE: string;
	FOUNDRY_API_KEY: string;
	/** Deployment do Foundry para conversa. Trocar de modelo é trocar esta var. */
	FOUNDRY_MODELO: string;
	/** Deployment para turnos com imagem. Ver o porquê medido em zap/harness.ts. */
	FOUNDRY_MODELO_VISAO: string;
	/** Os dois leitores da identidade da loja. Diferentes de proposito. */
	FOUNDRY_WORKER_A: string;
	FOUNDRY_WORKER_B: string;
	/** Teto de turnos por pessoa por dia. Var do wrangler: ajustar sem deploy de código. */
	LIMITE_TURNOS_DIA: string;
	/** "0" desliga a narração do andamento. Ausente = ligada. */
	NARRADOR?: string;
	/** Browser Run, para abrir a página oficial da NFC-e. */
	NAVEGADOR: Fetcher;
	/** A fila dos turnos. Ver o comentário em wrangler.zap.jsonc. */
	FILA: Queue<MensagemRecebida>;
}

/**
 * O turno inteiro: pensar e responder pelo WhatsApp.
 *
 * Mora aqui, fora do `fetch`, porque quem o executa é o CONSUMIDOR DA FILA. O
 * webhook não pode esperar: a Z-API reentrega o callback se demorarmos, e a
 * pessoa receberia a mesma resposta duas vezes.
 */
async function processarEResponder(mensagem: MensagemRecebida, env: ZapEnv): Promise<void> {
	const cfg: ZapiConfig = {
		instancia: env.ZAPI_INSTANCIA,
		token: env.ZAPI_TOKEN,
		clientToken: env.ZAPI_CLIENT_TOKEN,
	};
	try {
		const texto = await processarMensagem(
			env.DB,
			mensagem,
			{
				resource: env.FOUNDRY_RESOURCE,
				apiKey: env.FOUNDRY_API_KEY,
				modelo: env.FOUNDRY_MODELO,
				modeloVisao: env.FOUNDRY_MODELO_VISAO || env.FOUNDRY_MODELO,
				modeloWorkerA: env.FOUNDRY_WORKER_A || "claude-haiku-4-5",
				modeloWorkerB: env.FOUNDRY_WORKER_B || "claude-sonnet-5",
				navegador: env.NAVEGADOR,
				// Ligado a não ser que a var diga "0". Desligar o narrador é
				// trocar uma var, não fazer deploy.
				narrador: (env.NARRADOR ?? "1") !== "0",
			},
			Number(env.LIMITE_TURNOS_DIA) || 30,
			// Como o turno avisa a pessoa no meio do caminho. É o MESMO canal da
			// resposta final: para quem está no zap, é tudo a mesma conversa.
			(aviso) => responder(cfg, mensagem.telefone, aviso),
		);
		await responder(cfg, mensagem.telefone, texto);
	} catch (e) {
		// Mensagens de erro de conexão carregam credencial e isto vai para o log
		// da Cloudflare — mas só o NOME do tipo não diagnostica nada: em
		// 12/09/2026 o log disse "Error" e não dava para saber o que tinha
		// quebrado. Sai a mensagem, sem os segredos.
		const erro = e as Error;
		console.error(
			`falha ao processar mensagem: ${erro.name}: ${semSegredos(erro.message ?? "", env)}`,
		);
		console.error(`pilha: ${semSegredos(erro.stack ?? "", env).slice(0, 600)}`);
		await responder(
			cfg,
			mensagem.telefone,
			"Tive um problema aqui e não consegui responder agora. Tenta de novo em instantes?",
		).catch(() => {});
	}
}

/**
 * O texto com os segredos apagados, para poder ir ao log.
 *
 * O mecanismo que isto existe para impedir é conhecido: a biblioteca REJEITA a
 * credencial e devolve a string inteira dentro da exceção, que alguém imprime.
 * `split`/`join` em vez de regex de propósito — segredo não é padrão, é texto
 * literal, e escapar regex é mais uma chance de errar.
 */
function semSegredos(texto: string, env: ZapEnv): string {
	let limpo = texto;
	const segredos: ReadonlyArray<readonly [string, string]> = [
		["FOUNDRY_API_KEY", env.FOUNDRY_API_KEY],
		["ZAPI_TOKEN", env.ZAPI_TOKEN],
		["ZAPI_CLIENT_TOKEN", env.ZAPI_CLIENT_TOKEN],
		["ZAPI_INSTANCIA", env.ZAPI_INSTANCIA],
		["ZAPI_WEBHOOK_SEGREDO", env.ZAPI_WEBHOOK_SEGREDO],
	];
	for (const [nome, valor] of segredos) {
		if (valor) limpo = limpo.split(valor).join(`<${nome}>`);
	}
	return limpo;
}

export default {
	async fetch(request: Request, env: ZapEnv): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/" || url.pathname === "/saude") {
			return new Response("Listinia — WhatsApp. De pé.", {
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			});
		}

		// O webhook é público por natureza e o corpo dele declara de quem é a
		// mensagem. Sem segredo no path, qualquer um posta um telefone alheio e
		// lê a despensa de outra pessoa. O segredo entra por `wrangler secret`.
		if (url.pathname !== `/zapi/${env.ZAPI_WEBHOOK_SEGREDO}`) {
			return new Response("Não encontrado", { status: 404 });
		}
		if (request.method !== "POST") {
			return new Response("Método não permitido", { status: 405 });
		}

		const mensagem = await receber(request);
		// Eco, recibo e status entram aqui e param aqui. 200 para a Z-API não
		// ficar reentregando o mesmo callback.
		if (!mensagem) return new Response("ok");

		// Enfileirar é o único trabalho do webhook. O turno em si passa minutos
		// quando a mensagem traz uma nota fiscal, e o `waitUntil` era cancelado
		// no meio — a pessoa mandava a foto e não recebia NADA.
		await env.FILA.send(mensagem);
		return new Response("ok");
	},

	/**
	 * O consumidor: aqui o turno tem tempo de acontecer.
	 *
	 * Lote de um, configurado no wrangler: cada invocação cuida de uma mensagem,
	 * então uma nota de 22 itens não segura a resposta de outra pessoa.
	 */
	async queue(lote: MessageBatch<MensagemRecebida>, env: ZapEnv): Promise<void> {
		for (const item of lote.messages) {
			await processarEResponder(item.body, env);
			// `ack` explícito: sem ele, uma falha adiante no lote reentregaria
			// mensagem já respondida, e a pessoa receberia tudo de novo.
			item.ack();
		}
	},
} satisfies ExportedHandler<ZapEnv, MensagemRecebida>;
