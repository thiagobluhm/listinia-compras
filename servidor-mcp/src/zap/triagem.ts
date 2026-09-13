/**
 * O PORTÃO QUE PERGUNTA "ISSO É MESMO UM CUPOM?".
 *
 * Medido em 13/09/2026, no primeiro teste com memória de conversa: o dono
 * mandou a imagem de um CHECK VERDE e o produto respondeu "Capturei sua nota e
 * já tô analisando aqui", rodou o júri da loja na figura, e pediu o nome do
 * mercado. Nada no caminho perguntava se aquilo era um cupom — a foto entrava
 * e todo o resto assumia que sim.
 *
 * O estrago não é o turno perdido, é o que vem depois. Quando o segundo turno
 * chega para confirmar a loja, ele não tem mais a imagem (só o marcador no
 * histórico) e não tem os itens (a resposta anterior só dizia "40 itens"). Sem
 * fonte nenhuma e com uma pergunta para responder, o modelo PREENCHE: gravou 40
 * itens genéricos de despensa — "Açúcar", "Café Coado", "Pão Francês" — sem um
 * preço sequer e com data 2025-01-15. Quarenta linhas falsas com cara de compra
 * real, exatamente o contrário da `jamais-inventar`.
 *
 * Este arquivo corta isso na entrada, com o modelo BARATO, antes do júri da
 * loja e antes do turno de visão. Ele não lê a nota: só diz se há nota.
 *
 * FALHA PARA O LADO DE DEIXAR PASSAR, sempre. Um cupom recusado por engano é
 * pior que uma figura que passa: a figura só gasta um turno, o cupom recusado
 * quebra o caminho principal do produto. Por isso `null` em qualquer erro, e
 * por isso o prompt só afirma "não é cupom" quando a imagem é claramente outra
 * coisa — foto borrada, amassada ou mal enquadrada de cupom é CUPOM, e quem
 * trata dela é a regra de foto ruim que já existe no SYSTEM_PROMPT.
 */

import type { AnthropicFoundry } from "@anthropic-ai/foundry-sdk";
import type { FonteImagem } from "./estabelecimento";

export interface Triagem {
	/** A imagem é um cupom/nota fiscal? */
	ehCupom: boolean;
	/** Dá para ver a lista de itens comprados? */
	itensVisiveis: boolean;
	/** O que a imagem é, quando não é cupom. Para a resposta falar do que a pessoa mandou. */
	oQueE: string | null;
}

const PROMPT_TRIAGEM = `Você olha UMA imagem e responde só uma coisa: isso é um cupom fiscal?

Conta como cupom: cupom fiscal, NFC-e, nota fiscal, extrato de compra de loja —
qualquer papel que liste o que foi comprado. Vale mesmo que esteja borrado,
amassado, torto, cortado ou escuro. Qualidade ruim NÃO desqualifica: se dá para
reconhecer que é um cupom, é cupom.

Não conta como cupom: foto de pessoa, figura, emoji, print de tela, meme,
documento, boleto, cardápio, foto de produto na prateleira, paisagem, qualquer
outra coisa.

Responda SÓ com JSON, sem cerca de código:
{"cupom": true|false, "itens": true|false, "oque": "o que a imagem é, em até 5 palavras"}

"itens" é se dá para enxergar a lista de produtos comprados na imagem.
"oque" descreve o que você viu — preencha sempre, cupom ou não.`;

/**
 * Pergunta ao modelo barato se a imagem é um cupom.
 *
 * `null` significa "não sei" e o chamador deve DEIXAR PASSAR — nunca recusar.
 */
export async function triarImagem(
	client: AnthropicFoundry,
	modelo: string,
	imagem: FonteImagem,
): Promise<Triagem | null> {
	try {
		const r = await client.messages.create({
			model: modelo,
			max_tokens: 150,
			system: PROMPT_TRIAGEM,
			messages: [
				{
					role: "user",
					content: [
						{ type: "image", source: imagem },
						{ type: "text", text: "Isso é um cupom fiscal?" },
					],
				},
			],
		});
		const texto = r.content
			.filter((b) => b.type === "text")
			.map((b) => b.text)
			.join("");
		// Mesmo pedindo JSON puro, o modelo às vezes embrulha em cerca de código.
		const m = texto.match(/\{[\s\S]*\}/);
		if (!m) return null;
		const bruto = JSON.parse(m[0]) as Record<string, unknown>;
		// Só `true` explícito conta como cupom — mas a decisão de recusar exige
		// `false` explícito, e quem faz esse teste é o chamador.
		if (typeof bruto.cupom !== "boolean") return null;
		const oque = typeof bruto.oque === "string" && bruto.oque.trim() ? bruto.oque.trim() : null;
		return { ehCupom: bruto.cupom, itensVisiveis: bruto.itens === true, oQueE: oque };
	} catch {
		// Triador que cai deixa passar. Ver o cabeçalho: recusar cupom é pior.
		return null;
	}
}
