/**
 * Encartes: o núcleo compartilhado entre os dois caminhos de publicação.
 *
 * O lojista chega pela Claude (autenticado como pessoa, via OAuth) ou pelo
 * ERP dele (autenticado por chave de API, via POST /v1/encarte). As duas
 * portas resolvem QUAL estabelecimento é, e daí para baixo é este arquivo —
 * mesma validação, mesma substituição, mesma resposta. É isso que deixa a
 * automação pronta sem construir automação nenhuma.
 */

import { registrarExposicoes } from "./desempenho";

const UNIDADES = new Set(["un", "kg", "g", "L", "ml", "pct", "cx", "dz"]);
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const SO_NUMEROS = /^[\d\s.,-]+$/;

export interface ItemEncarteEntrada {
	produto?: unknown;
	marca?: unknown;
	unidade?: unknown;
	preco?: unknown;
	preco_de?: unknown;
	ean?: unknown;
	categoria?: unknown;
	limite_por_cliente?: unknown;
	observacao?: unknown;
}

interface ItemValidado {
	produto: string;
	marca: string | null;
	unidade: string;
	preco: number;
	preco_de: number | null;
	ean: string | null;
	categoria: string | null;
	limite_por_cliente: number | null;
	observacao: string | null;
}

export interface Rejeitado {
	linha: number;
	produto: string | null;
	motivo: string;
}

export interface Estabelecimento {
	id: string;
	tipo: string;
	nome: string;
}

/** Dígito verificador de GTIN-8/12/13/14. */
function eanValido(ean: string): boolean {
	if (!/^\d+$/.test(ean)) return false;
	if (![8, 12, 13, 14].includes(ean.length)) return false;
	const digitos = ean.split("").map(Number);
	const verificador = digitos.pop() as number;
	let soma = 0;
	// Da direita para a esquerda, pesos alternam 3 e 1.
	for (let i = digitos.length - 1, peso = 3; i >= 0; i--, peso = peso === 3 ? 1 : 3) {
		soma += digitos[i] * peso;
	}
	return (10 - (soma % 10)) % 10 === verificador;
}

function comoNumero(v: unknown): number | null {
	if (typeof v === "number") return Number.isFinite(v) ? v : null;
	if (typeof v === "string") {
		const limpo = v.replace(/[R$\s]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
		const n = Number(limpo);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function texto(v: unknown): string | null {
	if (typeof v !== "string") return null;
	const t = v.replace(/\s+/g, " ").trim();
	return t === "" ? null : t;
}

/**
 * Valida linha a linha. Linha ruim não derruba o encarte inteiro: ela sai da
 * lista com o motivo, e o lojista vê o que ficou de fora antes de confirmar.
 * Nada é adivinhado — coluna ambígua vira rejeição, nunca palpite.
 */
export function validarItens(entrada: ItemEncarteEntrada[]): {
	validos: ItemValidado[];
	rejeitados: Rejeitado[];
} {
	const validos: ItemValidado[] = [];
	const rejeitados: Rejeitado[] = [];
	const vistosEan = new Set<string>();
	const vistosNome = new Set<string>();

	entrada.forEach((bruto, i) => {
		const linha = i + 1;
		const produto = texto(bruto.produto);
		const recusa = (motivo: string) => rejeitados.push({ linha, produto, motivo });

		if (!produto) return recusa("produto vazio");
		if (SO_NUMEROS.test(produto)) return recusa("produto só com números — provável coluna errada");

		const preco = comoNumero(bruto.preco);
		if (preco === null) return recusa("preço ausente ou não numérico");
		if (preco <= 0) return recusa("preço zero ou negativo");

		const precoDe = bruto.preco_de === undefined || bruto.preco_de === null
			? null
			: comoNumero(bruto.preco_de);
		if (precoDe !== null && precoDe > 0 && preco > precoDe) {
			return recusa("preço promocional maior que o preço normal — provável troca de coluna");
		}

		const unidade = texto(bruto.unidade) ?? "un";
		if (!UNIDADES.has(unidade)) {
			return recusa(`unidade "${unidade}" fora da lista (${[...UNIDADES].join(", ")})`);
		}

		const ean = texto(bruto.ean);
		if (ean !== null && !eanValido(ean)) return recusa("código de barras inválido");

		if (ean) {
			if (vistosEan.has(ean)) return recusa("código de barras repetido no mesmo encarte");
			vistosEan.add(ean);
		}
		const chaveNome = `${produto.toLowerCase()}|${unidade}`;
		if (vistosNome.has(chaveNome)) return recusa("produto repetido no mesmo encarte");
		vistosNome.add(chaveNome);

		const limite = bruto.limite_por_cliente === undefined || bruto.limite_por_cliente === null
			? null
			: comoNumero(bruto.limite_por_cliente);

		validos.push({
			produto,
			marca: texto(bruto.marca),
			unidade,
			preco,
			preco_de: precoDe !== null && precoDe > 0 ? precoDe : null,
			ean,
			categoria: texto(bruto.categoria),
			limite_por_cliente: limite !== null ? Math.trunc(limite) : null,
			observacao: texto(bruto.observacao),
		});
	});

	return { validos, rejeitados };
}

export async function sha256Hex(valor: string): Promise<string> {
	const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function estabelecimentoPorChave(
	db: D1Database,
	chave: string,
): Promise<Estabelecimento | null> {
	const hash = await sha256Hex(chave);
	return await db
		.prepare("SELECT id, tipo, nome FROM estabelecimentos WHERE api_key_hash = ? AND ativo = 1")
		.bind(hash)
		.first<Estabelecimento>();
}

export async function estabelecimentoDoUsuario(
	db: D1Database,
	userId: string,
): Promise<Estabelecimento | null> {
	return await db
		.prepare("SELECT id, tipo, nome FROM estabelecimentos WHERE dono_user_id = ? AND ativo = 1")
		.bind(userId)
		.first<Estabelecimento>();
}

export interface PublicacaoEntrada {
	vigencia_inicio: string;
	vigencia_fim: string;
	itens: ItemEncarteEntrada[];
	substituir_vigente?: boolean;
	idempotency_key?: string | null;
}

export interface PublicacaoResultado {
	ok: boolean;
	encarte_id?: number;
	gravados: number;
	rejeitados: Rejeitado[];
	substituiu?: number | null;
	repetida?: boolean;
	motivo?: string;
}

export async function publicarEncarte(
	db: D1Database,
	estabelecimentoId: string,
	dados: PublicacaoEntrada,
): Promise<PublicacaoResultado> {
	if (!DATA_ISO.test(dados.vigencia_inicio) || !DATA_ISO.test(dados.vigencia_fim)) {
		return { ok: false, gravados: 0, rejeitados: [], motivo: "vigência deve estar em AAAA-MM-DD" };
	}
	if (dados.vigencia_fim < dados.vigencia_inicio) {
		return { ok: false, gravados: 0, rejeitados: [], motivo: "vigência termina antes de começar" };
	}

	// Mesma chave = mesma publicação. Retry de automação e clique duplo não
	// geram encarte repetido; devolvem o resultado da primeira vez.
	if (dados.idempotency_key) {
		const jaFeita = await db
			.prepare(
				"SELECT id FROM encartes WHERE estabelecimento_id = ? AND idempotency_key = ?",
			)
			.bind(estabelecimentoId, dados.idempotency_key)
			.first<{ id: number }>();
		if (jaFeita) {
			const c = await db
				.prepare("SELECT COUNT(*) AS n FROM itens_encarte WHERE encarte_id = ?")
				.bind(jaFeita.id)
				.first<{ n: number }>();
			return {
				ok: true,
				encarte_id: jaFeita.id,
				gravados: c?.n ?? 0,
				rejeitados: [],
				repetida: true,
			};
		}
	}

	const { validos, rejeitados } = validarItens(dados.itens);
	if (validos.length === 0) {
		return {
			ok: false,
			gravados: 0,
			rejeitados,
			motivo: "nenhuma linha válida — nada foi publicado e o encarte anterior segue no ar",
		};
	}

	const agora = new Date().toISOString();
	const criado = await db
		.prepare(
			`INSERT INTO encartes
			   (estabelecimento_id, vigencia_inicio, vigencia_fim, ativo, idempotency_key, publicado_em)
			 VALUES (?, ?, ?, 1, ?, ?)`,
		)
		.bind(
			estabelecimentoId,
			dados.vigencia_inicio,
			dados.vigencia_fim,
			dados.idempotency_key ?? null,
			agora,
		)
		.run();

	const encarteId = criado.meta.last_row_id as number;

	const inserir = db.prepare(
		`INSERT INTO itens_encarte
		   (encarte_id, produto, marca, unidade, preco, preco_de, ean, categoria, limite_por_cliente, observacao)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);

	// Em lotes: encarte de supermercado passa de 500 linhas com facilidade.
	const LOTE = 200;
	for (let i = 0; i < validos.length; i += LOTE) {
		await db.batch(
			validos.slice(i, i + LOTE).map((it) =>
				inserir.bind(
					encarteId,
					it.produto,
					it.marca,
					it.unidade,
					it.preco,
					it.preco_de,
					it.ean,
					it.categoria,
					it.limite_por_cliente,
					it.observacao,
				),
			),
		);
	}

	// Só agora o anterior sai do ar. Se algo acima falhasse, o lojista ficaria
	// com o encarte velho publicado — nunca com nenhum.
	let substituiu: number | null = null;
	if (dados.substituir_vigente !== false) {
		const r = await db
			.prepare("UPDATE encartes SET ativo = 0 WHERE estabelecimento_id = ? AND ativo = 1 AND id != ?")
			.bind(estabelecimentoId, encarteId)
			.run();
		substituiu = r.meta.changes ?? 0;
	}

	return { ok: true, encarte_id: encarteId, gravados: validos.length, rejeitados, substituiu };
}

export async function removerEncarte(db: D1Database, estabelecimentoId: string, encarteId: number) {
	const r = await db
		.prepare("DELETE FROM encartes WHERE id = ? AND estabelecimento_id = ?")
		.bind(encarteId, estabelecimentoId)
		.run();
	return { ok: true, encarte_id: encarteId, removido: (r.meta.changes ?? 0) > 0 };
}

export async function listarEncartes(db: D1Database, estabelecimentoId: string, limite: number) {
	const { results } = await db
		.prepare(
			`SELECT e.id, e.vigencia_inicio, e.vigencia_fim, e.ativo, e.publicado_em,
			        COUNT(i.id) AS itens
			   FROM encartes e
			   LEFT JOIN itens_encarte i ON i.encarte_id = e.id
			  WHERE e.estabelecimento_id = ?
			  GROUP BY e.id
			  ORDER BY e.publicado_em DESC
			  LIMIT ?`,
		)
		.bind(estabelecimentoId, limite)
		.all();
	return { total: results.length, encartes: results };
}

export async function itensDoEncarte(db: D1Database, estabelecimentoId: string, encarteId: number) {
	const { results } = await db
		.prepare(
			`SELECT i.* FROM itens_encarte i
			   JOIN encartes e ON e.id = i.encarte_id
			  WHERE i.encarte_id = ? AND e.estabelecimento_id = ?
			  ORDER BY i.produto`,
		)
		.bind(encarteId, estabelecimentoId)
		.all();
	return { encarte_id: encarteId, total: results.length, itens: results };
}

const OFERTA_SELECT = `
	SELECT i.produto, i.marca, i.unidade, i.preco, i.preco_de, i.ean,
	       e.id AS encarte_id, es.id AS estabelecimento_id,
	       i.limite_por_cliente, i.observacao,
	       es.nome AS mercado, es.tipo, es.cidade, es.uf,
	       e.vigencia_fim
	  FROM itens_encarte i
	  JOIN encartes e         ON e.id = i.encarte_id
	  JOIN estabelecimentos es ON es.id = e.estabelecimento_id
	 WHERE e.ativo = 1 AND es.ativo = 1
	   AND e.vigencia_inicio <= ? AND e.vigencia_fim >= ?`;

export async function buscarOfertas(
	db: D1Database,
	termo: string,
	opcoes: { tipo?: string; cidade?: string; limite?: number; userId?: string } = {},
) {
	const hoje = new Date().toISOString().slice(0, 10);
	const binds: unknown[] = [hoje, hoje, `%${termo}%`];
	let sql = `${OFERTA_SELECT} AND i.produto LIKE ?`;
	if (opcoes.tipo) {
		sql += " AND es.tipo = ?";
		binds.push(opcoes.tipo);
	}
	if (opcoes.cidade) {
		sql += " AND es.cidade = ?";
		binds.push(opcoes.cidade);
	}
	sql += " ORDER BY i.preco ASC LIMIT ?";
	binds.push(opcoes.limite ?? 30);

	const { results } = await db.prepare(sql).bind(...binds).all();

	// Busca não é lista. Fica registrada, mas em contexto próprio — juntar as
	// duas infla o alcance qualificado que se vende ao lojista.
	if (opcoes.userId && results.length > 0) {
		await registrarExposicoes(
			db,
			opcoes.userId,
			"busca",
			results.map((o) => {
				const r = o as Record<string, unknown>;
				return {
					estabelecimento_id: String(r.estabelecimento_id),
					encarte_id: Number(r.encarte_id),
					produto: String(r.produto),
					ean: r.ean ? String(r.ean) : null,
					preco_ofertado: Number(r.preco),
					venceu: false,
				};
			}),
		);
	}

	return { termo, total: results.length, ofertas: results };
}

/**
 * Cruza a lista de compras inteira com os encartes vigentes.
 *
 * Casar 40 itens contra N encartes é trabalho de banco. Feito no agente, vira
 * 40 comparações de string que erram; aqui é uma consulta por item, com o
 * mais barato no topo. O que não casar volta como "sem cotação" — nunca com
 * preço estimado.
 */
export async function ofertasParaLista(
	db: D1Database,
	itens: string[],
	opcoes: { tipo?: string; cidade?: string; userId?: string } = {},
) {
	const achados: unknown[] = [];
	const expostas: Parameters<typeof registrarExposicoes>[3] = [];
	const semCotacao: string[] = [];
	let total = 0;

	for (const item of itens) {
		const termo = item.replace(/\s+/g, " ").trim();
		if (!termo) continue;
		const r = await buscarOfertas(db, termo, { tipo: opcoes.tipo, cidade: opcoes.cidade, limite: 5 });
		if (r.ofertas.length === 0) {
			semCotacao.push(termo);
			continue;
		}
		const melhor = r.ofertas[0] as { preco: number };
		total += melhor.preco;
		achados.push({ item: termo, melhor, alternativas: r.ofertas.slice(1) });

		// Impressão qualificada: a pessoa tinha esse item na lista porque a
		// despensa dela indicava que estava acabando. É o dado que vale mais
		// que CPM — e a primeira posição é marcada como vencedora, porque
		// estar na lista e ganhar o item são coisas diferentes.
		if (opcoes.userId) {
			expostas.push(
				...r.ofertas.map((o, idx) => {
					const x = o as Record<string, unknown>;
					return {
						estabelecimento_id: String(x.estabelecimento_id),
						encarte_id: Number(x.encarte_id),
						produto: String(x.produto),
						ean: x.ean ? String(x.ean) : null,
						preco_ofertado: Number(x.preco),
						venceu: idx === 0,
					};
				}),
			);
		}
	}

	if (opcoes.userId && expostas.length > 0) {
		await registrarExposicoes(db, opcoes.userId, "lista", expostas);
	}

	return {
		itens_cotados: achados.length,
		itens_sem_cotacao: semCotacao,
		total_estimado: Math.round(total * 100) / 100,
		aviso_total:
			semCotacao.length > 0
				? `${semCotacao.length} item(ns) sem cotação ficaram de fora da soma`
				: null,
		lista: achados,
	};
}
