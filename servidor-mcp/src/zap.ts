/**
 * Worker do WhatsApp — o terceiro perfil do Listinia.
 *
 * Diferente de compras.ts e mercado.ts, este NÃO é um servidor MCP e não sobe
 * o OAuthProvider: quem conversa aqui é uma pessoa pelo zap, não um cliente
 * MCP. As ferramentas são as mesmas, chamadas em memória (zap/ferramentas.ts),
 * sobre o mesmo D1. A identidade vem do telefone em vez do Google.
 */

import { processarMensagem } from "./zap/harness";
import { responder, receber, type ZapiConfig } from "./zap/zapi";
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
	/** Deployment do Foundry. Trocar de modelo é trocar esta var. */
	FOUNDRY_MODELO: string;
	/** Teto de turnos por pessoa por dia. Var do wrangler: ajustar sem deploy de código. */
	LIMITE_TURNOS_DIA: string;
	/** Browser Run, para abrir a página oficial da NFC-e. */
	NAVEGADOR: Fetcher;
}

export default {
	async fetch(request: Request, env: ZapEnv, ctx: ExecutionContext): Promise<Response> {
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

		const cfg: ZapiConfig = {
			instancia: env.ZAPI_INSTANCIA,
			token: env.ZAPI_TOKEN,
			clientToken: env.ZAPI_CLIENT_TOKEN,
		};

		// Responder o webhook na hora e processar depois: o turno do modelo é
		// mais lento que o timeout da Z-API, e demorar aqui vira reentrega — a
		// pessoa receberia a mesma resposta duas vezes.
		ctx.waitUntil(
			(async () => {
				try {
					const texto = await processarMensagem(
						env.DB,
						mensagem,
						{
							resource: env.FOUNDRY_RESOURCE,
							apiKey: env.FOUNDRY_API_KEY,
							modelo: env.FOUNDRY_MODELO,
							navegador: env.NAVEGADOR,
						},
						Number(env.LIMITE_TURNOS_DIA) || 30,
					);
					await responder(cfg, mensagem.telefone, texto);
				} catch (e) {
					// Só o nome do tipo: mensagens de erro de conexão carregam
					// credencial e isto vai para o log da Cloudflare.
					console.error(`falha ao processar mensagem: ${(e as Error).name}`);
					await responder(
						cfg,
						mensagem.telefone,
						"Tive um problema aqui e não consegui responder agora. Tenta de novo em instantes?",
					).catch(() => {});
				}
			})(),
		);

		return new Response("ok");
	},
} satisfies ExportedHandler<ZapEnv>;
