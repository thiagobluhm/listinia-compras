/**
 * O harness: o que acontece entre a mensagem chegar e a resposta sair.
 *
 * A chamada do modelo está atrás de UMA função (`chamarModelo`), e é de
 * propósito: enquanto ela for a única costura, trocar de provider é mexer num
 * arquivo, não reescrever o produto.
 *
 * O provider é Claude no Microsoft Foundry, pelo client dedicado do SDK — não
 * o client de primeira parte com `baseURL` trocado. O Foundry serve as duas
 * famílias no mesmo recurso, então o modelo é `var` do Worker e não constante:
 * trocar claude-opus-5 por claude-sonnet-5 ou claude-haiku-4-5 é uma linha do
 * wrangler, sem deploy de código.
 *
 * O loop de ferramentas é o Tool Runner do SDK, que roda CLIENT-SIDE: ele só
 * orquestra pedir -> executar a nossa função -> repetir. Por isso cabe dentro
 * do Worker e não depende do MCP connector, que é feature de servidor e não
 * existe em endpoint de terceiro.
 */

import { AnthropicFoundry } from "@anthropic-ai/foundry-sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { abrirFerramentas, type FerramentaLLM } from "./ferramentas";
import { resolverUsuarioPorTelefone } from "./identidade";
import type { MensagemRecebida } from "./zapi";

/**
 * A regra `jamais-inventar`, que nos plugins é carregada pelos 10 agentes.
 *
 * No WhatsApp não existem agentes — existe este system prompt e mais nada. Se
 * ele sair daqui, o produto vira "só a URL": `nota_registrar` e
 * `produto_salvar` gravam igual, sem trava, e a pessoa do zap não tem como
 * saber que há um modelo adivinhando preço. O texto completo e o porquê estão
 * em plugins/listinia-compras/references/jamais-inventar.md e em PLUGINS.md:115.
 */
export const SYSTEM_PROMPT = `Você é o Listinia, a despensa da casa, atendendo pelo WhatsApp.

JAMAIS INVENTAR — vale sem exceção e sem "só dessa vez".
Este produto controla dinheiro e comida de uma casa. Faltar dado é sempre
melhor que ter dado falso.

É proibido:
- Preencher nome, quantidade, unidade, preço, data ou mercado que você não leu
  com clareza. Não existe "deve ser mais ou menos isso".
- Completar item parcialmente lido pelo que "costuma ser" — nem por marca, nem
  por preço de mercado, nem pelo que apareceu em outra nota.
- Recalcular de cabeça o que o servidor calcula (dias restantes, status,
  categoria, total). Se precisa do número, peça à ferramenta.
- Somar, converter unidade ou fechar total de cabeça.
- Inventar oferta, preço de encarte ou disponibilidade que você não leu.
- Apresentar suposição com cara de fato. Leitura por foto e correspondência
  aproximada de nome são sugestões a confirmar, e têm que ser ditas assim.

No lugar disso:
1. Campo não lido -> null, e diga à pessoa o que faltou, item a item.
2. Não deu para ler nada -> diga o motivo real. Não improvise outro caminho.
3. Dúvida entre duas leituras -> não escolha. Apresente as duas.
4. Suposição útil -> rotule como suposição.

Sempre diga o que ficou de fora antes de gravar qualquer coisa. Nada entra na
despensa com um buraco silencioso.

Você fala por WhatsApp: respostas curtas, sem markdown pesado, sem tabela.`;

/** O schema que `betaTool` aceita, sem depender de `json-schema-to-ts` direto. */
type SchemaDeObjeto = Parameters<typeof betaTool>[0]["inputSchema"];

/** O que o Worker precisa saber para falar com o Foundry. Vem do env. */
export interface ConfigModelo {
	/** Nome do recurso: https://{resource}.services.ai.azure.com/anthropic/v1 */
	resource: string;
	apiKey: string;
	/** Deployment do Foundry. Ex.: claude-opus-5, claude-sonnet-5, claude-haiku-4-5. */
	modelo: string;
}

export interface EntradaModelo {
	system: string;
	ferramentas: FerramentaLLM[];
	mensagem: MensagemRecebida;
	chamar(nome: string, argumentos: Record<string, unknown>): Promise<string>;
}

/**
 * A única costura com o provider de LLM.
 *
 * Teto de iterações porque o turno roda em `waitUntil` e ninguém está olhando:
 * um modelo que se enrosque chamando ferramenta em círculo queima dinheiro sem
 * nunca responder. 12 dá folga para uma nota fiscal inteira (ler, conferir,
 * gravar item a item) e ainda assim tem fim.
 */
async function chamarModelo(entrada: EntradaModelo, cfg: ConfigModelo): Promise<string> {
	const client = new AnthropicFoundry({ resource: cfg.resource, apiKey: cfg.apiKey });

	// As 10 ferramentas do MCP viram ferramentas do runner sem reescrever
	// nenhuma: o `input_schema` que veio do servidor MCP é aceito como está.
	//
	// O cast existe porque `betaTool` é genérico sobre um schema LITERAL, para
	// inferir o tipo do argumento em tempo de compilação. Os nossos chegam em
	// tempo de execução, vindos do servidor MCP, então não há o que inferir — a
	// validação do argumento continua acontecendo, só que no runner e não no
	// compilador. Quem garante a forma é o MCP, que só emite schema de objeto.
	const ferramentas = entrada.ferramentas.map((f) =>
		betaTool({
			name: f.name,
			description: f.description,
			inputSchema: f.input_schema as unknown as SchemaDeObjeto,
			run: (argumentos: unknown) =>
				entrada.chamar(f.name, (argumentos ?? {}) as Record<string, unknown>),
		}),
	);

	// A foto do cupom é o caso de uso principal, então ela entra como imagem de
	// verdade e não como link no texto. A URL vem da Z-API e é pública.
	const conteudo: Array<Record<string, unknown>> = [];
	if (entrada.mensagem.imagemUrl) {
		conteudo.push({ type: "image", source: { type: "url", url: entrada.mensagem.imagemUrl } });
	}
	conteudo.push({ type: "text", text: entrada.mensagem.texto || "(mensagem sem texto)" });

	const resposta = await client.beta.messages.toolRunner({
		model: cfg.modelo,
		max_tokens: 4096,
		system: entrada.system,
		tools: ferramentas,
		messages: [{ role: "user", content: conteudo as never }],
		max_iterations: 12,
	});

	const texto = resposta.content
		.filter((b) => b.type === "text")
		.map((b) => b.text)
		.join("\n")
		.trim();

	// Sem texto = o turno acabou no teto de iterações, no meio de uma sequência
	// de ferramentas. Dizer isso é melhor que devolver silêncio, e `jamais-inventar`
	// proíbe fabricar um resumo do que não terminou.
	return texto || "Comecei a mexer nisso mas não consegui fechar a resposta. Me manda de novo?";
}

/** Mensagem entra, texto de resposta sai. Quem manda pelo canal é o entrypoint. */
export async function processarMensagem(
	db: D1Database,
	mensagem: MensagemRecebida,
	cfg: ConfigModelo,
): Promise<string> {
	const userId = await resolverUsuarioPorTelefone(db, mensagem.telefone);
	const ferramentas = await abrirFerramentas(db, userId);
	try {
		return await chamarModelo(
			{
				system: SYSTEM_PROMPT,
				ferramentas: ferramentas.defs,
				mensagem,
				chamar: ferramentas.chamar,
			},
			cfg,
		);
	} finally {
		await ferramentas.fechar();
	}
}
