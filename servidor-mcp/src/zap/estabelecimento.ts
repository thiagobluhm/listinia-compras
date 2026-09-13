/**
 * Quem é a loja deste cupom — por acordo entre dois leitores, e não por fé.
 *
 * O PROBLEMA, medido e não suposto: a mesma foto do mesmo cupom, lida duas
 * vezes pelo mesmo modelo, devolveu "Comata" numa passada e "Cometa" na outra.
 * O papel diz Comata. Nenhuma das duas leituras se anuncia como duvidosa —
 * "Cometa" é um nome perfeitamente plausível de mercado.
 *
 * Isso envenena o produto de um jeito silencioso: `mercado` é o campo pelo qual
 * o histórico compara preço entre lojas. "Comata" e "Cometa" viram DOIS
 * estabelecimentos, e a comparação que é o coração do produto simplesmente
 * para de funcionar — sem erro, sem aviso, meses depois.
 *
 * A SAÍDA: dois workers leem a identidade de forma independente e um judge
 * decide. A variância que causava o bug vira o DETECTOR dele — concordância é
 * a inferência, divergência é o sinal de perguntar à pessoa. Das duas, uma:
 * ou o sistema infere com segurança, ou ele pergunta. Nunca chuta.
 *
 * Modelos DIFERENTES de propósito: dois erros do mesmo modelo são
 * correlacionados — ele tende a errar igual nas duas passadas, os dois
 * concordam no erro e o judge aprova lixo. Modelos diferentes erram diferente.
 *
 * O judge é CÓDIGO no caso comum. Quando CNPJ e nome normalizado batem não há
 * nada a julgar, e um modelo ali só somaria custo e uma chance de alucinar.
 */

import type { AnthropicFoundry } from "@anthropic-ai/foundry-sdk";
import { normalizarNome, resolverEstabelecimento } from "../desempenho";

export interface IdentidadeLoja {
	/** 14 dígitos, já validados. Null quando ilegível ou com dígito verificador errado. */
	cnpj: string | null;
	nome: string | null;
	/** O bairro é o desempatador: a pessoa sabe dele de cor, do nome ela duvida. */
	bairro: string | null;
	cidade: string | null;
	uf: string | null;
}

export interface VeredictoLoja {
	/** 'acordo' = os dois leram igual. 'divergente' = tem que perguntar. */
	status: "acordo" | "divergente" | "nada";
	/** Só quando há acordo. */
	identidade: IdentidadeLoja | null;
	/** Id do estabelecimento já cadastrado, quando o nome ou apelido resolve. */
	estabelecimentoId: string | null;
	/** O que perguntar à pessoa, quando divergente. */
	pergunta: string | null;
	leituras: IdentidadeLoja[];
}

/**
 * CNPJ com os dois dígitos verificadores conferidos.
 *
 * É isto que separa o CNPJ do nome: um dígito lido errado quebra a validação
 * quase sempre, então o erro fica DETECTÁVEL. Com nome não há como saber.
 */
export function cnpjValido(valor: string): boolean {
	const d = valor.replace(/\D/g, "");
	if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
	const digito = (ate: number): number => {
		// Percorrendo de trás para frente, o peso SEMPRE começa em 2 e sobe até 9,
		// voltando a 2. Comecei isto em `ate - 7` e o validador reprovava CNPJ
		// legítimo — inclusive o do cupom que serviu de teste, que é válido.
		let peso = 2;
		let soma = 0;
		for (let i = ate - 1; i >= 0; i--) {
			soma += Number(d[i]) * peso;
			peso = peso === 9 ? 2 : peso + 1;
		}
		const r = soma % 11;
		return r < 2 ? 0 : 11 - r;
	};
	return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}

export const PROMPT_WORKER = `Você lê APENAS o cabeçalho de um cupom fiscal brasileiro e devolve quem é a loja.

Responda SÓ com um objeto JSON, sem texto antes ou depois, neste formato:
{"cnpj": "...", "nome": "...", "bairro": "...", "cidade": "...", "uf": ".."}

Regras, sem exceção:
- Copie o que está IMPRESSO. Não corrija nome que pareça estranho, não complete
  abreviação, não troque por uma rede conhecida que se pareça.
- Campo que você não conseguir ler com certeza: null. Nunca aproxime.
- O cnpj vai só com dígitos, sem pontuação.
- Não leia os itens da compra. Só o cabeçalho.`;

/**
 * A imagem já em BYTES, do jeito que a Messages API aceita.
 *
 * Não se manda a URL. Quem baixaria a foto seria o servidor do modelo, e ele
 * respeita o `robots.txt` do host — o host de mídia da Z-API proíbe robôs, e
 * por causa disso todo turno com foto morria com
 * `400 "This URL is disallowed by the website's robots.txt file."`
 * (medido em produção em 12/09/2026, no primeiro teste real com nota).
 * Quem baixa é o Worker, que não é robô de ninguém.
 */
export type TipoImagem = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface FonteImagem {
	type: "base64";
	media_type: TipoImagem;
	data: string;
}

/** Um worker: uma leitura independente do cabeçalho. */
async function lerIdentidade(
	client: AnthropicFoundry,
	modelo: string,
	imagem: FonteImagem,
): Promise<IdentidadeLoja | null> {
	try {
		const r = await client.messages.create({
			model: modelo,
			max_tokens: 500,
			system: PROMPT_WORKER,
			messages: [
				{
					role: "user",
					content: [
						{ type: "image", source: imagem },
						{ type: "text", text: "Quem é a loja deste cupom?" },
					],
				},
			],
		});
		const texto = r.content
			.filter((b) => b.type === "text")
			.map((b) => b.text)
			.join("");
		// O modelo às vezes embrulha em cerca de código mesmo pedindo JSON puro.
		const m = texto.match(/\{[\s\S]*\}/);
		if (!m) return null;
		const bruto = JSON.parse(m[0]) as Record<string, unknown>;
		const cnpj = typeof bruto.cnpj === "string" ? bruto.cnpj.replace(/\D/g, "") : "";
		const txt = (v: unknown): string | null =>
			typeof v === "string" && v.trim() ? v.trim() : null;
		return {
			cnpj: cnpjValido(cnpj) ? cnpj : null,
			nome: txt(bruto.nome),
			bairro: txt(bruto.bairro),
			cidade: txt(bruto.cidade),
			uf: txt(bruto.uf),
		};
	} catch {
		// Worker que cai não derruba o turno: o judge trata como leitura ausente.
		return null;
	}
}

/**
 * A pergunta que se faz à pessoa quando o judge não fecha.
 *
 * FECHADA e ancorada no bairro, de propósito. Perguntar "li Conata e Cometa,
 * qual é o certo?" expõe a confusão da máquina e oferece duas opções erradas.
 * "É o Cometa da Maraponga?" é respondível com uma palavra por alguém que está
 * no sofá — o bairro a pessoa sabe de cor, do nome ela duvida tanto quanto nós.
 * E um "não, é o Comata" vale mais que qualquer leitura: é a fonte humana, e
 * vira o nome canônico da loja.
 */
function perguntaFechada(nome: string | null, bairro: string | null, cidade: string | null): string {
	// "o Supermercados Cometa Ltda da Maraponga" é como fala um cartório. Gente
	// fala "o Cometa da Maraponga". O casco societário sai SÓ da pergunta — o
	// nome completo continua no que foi lido e no que se grava.
	const curto = nome
		?.replace(/\b(suo?permercados?|mercadinho|comercial|distribuidora|atacad(ao|ista))\b/gi, "")
		.replace(/\b(ltda|me|epp|eireli|s\.?\/?a|cia)\b\.?/gi, "")
		.replace(/\s{2,}/g, " ")
		.trim();
	const onde = bairro ?? cidade;
	const alvo = (curto || nome) ? (onde ? `${curto || nome} da ${onde}` : (curto || nome)) : null;
	return alvo
		? `Rapidinho: esse mercado é o ${alvo}? Se não for, me diz o nome certo dele.`
		: "Só uma coisa: qual o nome do mercado onde você comprou?";
}

/**
 * O judge, em código. Só decide; nunca lê a imagem.
 *
 * Ordem de autoridade: CNPJ válido idêntico é acordo forte — dois modelos
 * diferentes acertarem os mesmos 14 dígitos COM dígito verificador batendo não
 * acontece por acaso. Sem CNPJ, sobra o nome normalizado, que é acordo fraco
 * mas suficiente quando idêntico.
 */
export function julgar(a: IdentidadeLoja | null, b: IdentidadeLoja | null): VeredictoLoja {
	const leituras = [a, b].filter((x): x is IdentidadeLoja => x !== null);
	const base: VeredictoLoja = {
		status: "nada",
		identidade: null,
		estabelecimentoId: null,
		pergunta: null,
		leituras,
	};
	if (leituras.length === 0) return base;

	if (leituras.length === 1) {
		// Um worker caiu. Uma leitura sozinha nunca é acordo — é justamente o
		// cenário sem contraprova que este arquivo existe para não aceitar.
		const so = leituras[0]!;
		return {
			...base,
			status: "divergente",
			pergunta: perguntaFechada(so.nome, so.bairro, so.cidade),
		};
	}

	const [x, y] = leituras as [IdentidadeLoja, IdentidadeLoja];

	if (x.cnpj && y.cnpj && x.cnpj === y.cnpj) {
		// Dois modelos diferentes chegando aos mesmos 14 dígitos COM verificador
		// batendo não é coincidência: a identidade está resolvida. O NOME, porém,
		// não herda essa confiança — se eles divergiram nele, ele fica null e
		// quem cuida disso é o apelido, não um palpite gravado como verdade.
		const mesmoNome = normalizarNome(x.nome ?? "") === normalizarNome(y.nome ?? "");
		return {
			...base,
			status: "acordo",
			identidade: { ...x, nome: mesmoNome ? (x.nome ?? y.nome) : null },
			// Identidade resolvida, grafia não. A pergunta vai junto para o turno
			// confirmar o nome sem travar o registro: o CNPJ já basta para gravar.
			pergunta: mesmoNome ? null : perguntaFechada(y.nome ?? x.nome, x.bairro ?? y.bairro, x.cidade ?? y.cidade),
		};
	}
	if ((x.cnpj && !y.cnpj) || (y.cnpj && !x.cnpj)) {
		// UM leu o CNPJ e o outro não leu NENHUM — ou seja, ninguém contradiz.
		// Isso resolve a identidade, e a segunda confirmação não vem do outro
		// modelo: vem dos dígitos verificadores. Um CNPJ que fecha os dois DV
		// carrega a própria contraprova (errar dígitos e ainda passar é ~1%).
		// Exigir que os DOIS leiam o número degeneraria para "pergunta sempre",
		// que é exatamente o que este desenho existe para evitar.
		const comCnpj = (x.cnpj ? x : y) as IdentidadeLoja;
		const mesmoNome = normalizarNome(x.nome ?? "") === normalizarNome(y.nome ?? "");
		return {
			...base,
			status: "acordo",
			identidade: { ...comCnpj, nome: mesmoNome ? comCnpj.nome : null },
			pergunta: mesmoNome
				? null
				: perguntaFechada(comCnpj.nome, comCnpj.bairro ?? x.bairro ?? y.bairro, comCnpj.cidade),
		};
	}
	if (x.cnpj && y.cnpj && x.cnpj !== y.cnpj) {
		return {
			...base,
			status: "divergente",
			pergunta: perguntaFechada(x.nome ?? y.nome, x.bairro ?? y.bairro, x.cidade ?? y.cidade),
		};
	}

	const nx = normalizarNome(x.nome ?? "");
	const ny = normalizarNome(y.nome ?? "");
	if (nx && nx === ny) {
		return { ...base, status: "acordo", identidade: { ...x, cnpj: x.cnpj ?? y.cnpj } };
	}
	if (!nx && !ny) return base;

	return {
		...base,
		status: "divergente",
		pergunta: perguntaFechada(y.nome ?? x.nome, x.bairro ?? y.bairro, x.cidade ?? y.cidade),
	};
}

/**
 * O pipeline: dois workers, um judge, e a base de estabelecimentos no fim.
 *
 * Roda em paralelo porque as duas leituras são independentes por construção —
 * fazer em série só somaria latência num turno que a pessoa está esperando.
 */
export async function resolverLoja(
	client: AnthropicFoundry,
	db: D1Database,
	imagem: FonteImagem,
	modeloA: string,
	modeloB: string,
): Promise<VeredictoLoja> {
	const [a, b] = await Promise.all([
		lerIdentidade(client, modeloA, imagem),
		lerIdentidade(client, modeloB, imagem),
	]);
	const v = julgar(a, b);
	if (v.status === "acordo" && v.identidade?.nome) {
		v.estabelecimentoId = await resolverEstabelecimento(db, v.identidade.nome);
	}
	return v;
}
