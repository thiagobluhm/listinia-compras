/**
 * Atribuição: oferta mostrada → lista → nota fiscal → preço cobrado.
 *
 * É o que o Listinia tem e uma rede de banner não tem. Banner mede clique
 * porque é cego para a compra; aqui a compra é o dado primário. Por isso
 * nenhuma métrica daqui é estimada: ou saiu de uma nota fiscal, ou não existe.
 *
 * Duas travas guiam todo este arquivo:
 *   1. Casamento é exato ou não é. Atribuir venda ao lojista errado é pior
 *      que não atribuir — subcontar é honesto, supercontar é fraude.
 *   2. Nada sai daqui abaixo do piso de anonimato. O lojista recebe coorte,
 *      nunca pessoa.
 */

/** Abaixo disto, a célula não é reportada. Protege o consumidor de ser
 *  identificado por eliminação num bairro pequeno. */
const PISO_ANONIMATO = 5;

/** Dias após o fim da vigência em que uma compra ainda conta. Cupom de
 *  sábado vira compra de domingo com frequência. */
const CARENCIA_DIAS = 2;

export function normalizarNome(valor: string): string {
	return valor
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Liga o nome do mercado que veio na nota a um estabelecimento cadastrado.
 * Exato no nome normalizado, ou exato num apelido. Nunca aproximado.
 */
export async function resolverEstabelecimento(
	db: D1Database,
	mercado: string,
): Promise<string | null> {
	const norm = normalizarNome(mercado);
	if (!norm) return null;

	const direto = await db
		.prepare("SELECT id FROM estabelecimentos WHERE nome_normalizado = ? AND ativo = 1")
		.bind(norm)
		.first<{ id: string }>();
	if (direto) return direto.id;

	const apelido = await db
		.prepare("SELECT estabelecimento_id AS id FROM estabelecimento_apelidos WHERE nome_normalizado = ?")
		.bind(norm)
		.first<{ id: string }>();
	return apelido?.id ?? null;
}

export interface LinhaExposicao {
	estabelecimento_id: string;
	encarte_id: number;
	produto: string;
	ean: string | null;
	preco_ofertado: number;
	venceu: boolean;
}

/** Grava o que foi mostrado. Sem isto não há numerador — e não há como
 *  provar ao lojista que a oferta dele chegou a alguém. */
export async function registrarExposicoes(
	db: D1Database,
	userId: string,
	contexto: "lista" | "busca",
	linhas: LinhaExposicao[],
): Promise<number> {
	if (linhas.length === 0) return 0;
	const agora = new Date().toISOString();
	const ins = db.prepare(
		`INSERT INTO exposicoes
		   (user_id, estabelecimento_id, encarte_id, produto, ean, preco_ofertado, contexto, venceu, momento)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);
	const LOTE = 100;
	for (let i = 0; i < linhas.length; i += LOTE) {
		await db.batch(
			linhas.slice(i, i + LOTE).map((l) =>
				ins.bind(
					userId,
					l.estabelecimento_id,
					l.encarte_id,
					l.produto,
					l.ean,
					l.preco_ofertado,
					contexto,
					l.venceu ? 1 : 0,
					agora,
				),
			),
		);
	}
	return linhas.length;
}

function protegido(pessoas: number): boolean {
	return pessoas >= PISO_ANONIMATO;
}

function suprimir<T>(pessoas: number, valor: T): T | null {
	return protegido(pessoas) ? valor : null;
}

export interface DesempenhoOpcoes {
	encarte_id?: number;
	desde?: string;
	ate?: string;
}

/**
 * Os quatro estágios do funil, para um estabelecimento.
 *
 * 1. Alcance qualificado — pessoas distintas que viram a oferta tendo o item
 *    na lista. Não é impressão: é intenção declarada pelo consumo real.
 * 2. Captura da lista — em quantas dessas a oferta foi a mais barata, ou seja,
 *    ganhou o item.
 * 3. Compra confirmada — nota daquela loja, na vigência, com aquele item.
 * 4. Aderência de preço — o cobrado bateu com o anunciado.
 */
export async function desempenhoEncarte(
	db: D1Database,
	estabelecimentoId: string,
	opcoes: DesempenhoOpcoes = {},
) {
	const encarte = opcoes.encarte_id
		? await db
				.prepare("SELECT * FROM encartes WHERE id = ? AND estabelecimento_id = ?")
				.bind(opcoes.encarte_id, estabelecimentoId)
				.first<{ id: number; vigencia_inicio: string; vigencia_fim: string }>()
		: await db
				.prepare(
					"SELECT * FROM encartes WHERE estabelecimento_id = ? ORDER BY publicado_em DESC LIMIT 1",
				)
				.bind(estabelecimentoId)
				.first<{ id: number; vigencia_inicio: string; vigencia_fim: string }>();

	if (!encarte) {
		return { ok: false, motivo: "nenhum encarte publicado ainda para este estabelecimento" };
	}

	const fimComCarencia = new Date(
		Date.parse(`${encarte.vigencia_fim}T00:00:00Z`) + CARENCIA_DIAS * 86400000,
	)
		.toISOString()
		.slice(0, 10);

	// --------------------------------------------------- 1 e 2: exposições
	const expo = await db
		.prepare(
			`SELECT contexto,
			        COUNT(*)                     AS eventos,
			        COUNT(DISTINCT user_id)      AS pessoas,
			        COUNT(DISTINCT produto)      AS produtos,
			        SUM(venceu)                  AS venceram
			   FROM exposicoes
			  WHERE encarte_id = ?
			  GROUP BY contexto`,
		)
		.bind(encarte.id)
		.all<{ contexto: string; eventos: number; pessoas: number; produtos: number; venceram: number }>();

	const naLista = expo.results.find((r) => r.contexto === "lista");
	const naBusca = expo.results.find((r) => r.contexto === "busca");

	// ------------------------------------------------- 3: compra confirmada
	// Casamento exato: mesmo usuário, mesma loja, dentro da vigência, e o
	// item batendo por EAN ou por nome normalizado idêntico. Nome parecido
	// não entra — subcontar é honesto.
	const compras = await db
		.prepare(
			`SELECT COUNT(DISTINCT n.id)              AS notas,
			        COUNT(DISTINCT n.user_id)         AS pessoas,
			        COUNT(*)                          AS itens,
			        SUM(COALESCE(i.preco_total, 0))   AS valor_itens,
			        SUM(COALESCE(n.total, 0)) / NULLIF(COUNT(DISTINCT n.id), 0) AS ticket_medio
			   FROM exposicoes x
			   JOIN notas n
			     ON n.user_id = x.user_id
			    AND n.estabelecimento_id = x.estabelecimento_id
			    AND n.data >= ? AND n.data <= ?
			   JOIN itens_nota i
			     ON i.nota_id = n.id
			    AND (
			          (x.ean IS NOT NULL AND i.item IS NOT NULL AND x.ean = i.item)
			       OR LOWER(TRIM(i.item)) = LOWER(TRIM(x.produto))
			        )
			  WHERE x.encarte_id = ? AND x.contexto = 'lista'`,
		)
		.bind(encarte.vigencia_inicio, fimComCarencia, encarte.id)
		.first<{ notas: number; pessoas: number; itens: number; valor_itens: number; ticket_medio: number }>();

	// ------------------------------------------------ 4: aderência de preço
	const preco = await db
		.prepare(
			`SELECT
			   SUM(CASE WHEN i.preco_unitario IS NULL THEN 1 ELSE 0 END)                        AS sem_preco,
			   SUM(CASE WHEN ABS(i.preco_unitario - x.preco_ofertado) < 0.01 THEN 1 ELSE 0 END) AS igual,
			   SUM(CASE WHEN i.preco_unitario > x.preco_ofertado + 0.01 THEN 1 ELSE 0 END)      AS acima,
			   SUM(CASE WHEN i.preco_unitario < x.preco_ofertado - 0.01 THEN 1 ELSE 0 END)      AS abaixo
			   FROM exposicoes x
			   JOIN notas n
			     ON n.user_id = x.user_id
			    AND n.estabelecimento_id = x.estabelecimento_id
			    AND n.data >= ? AND n.data <= ?
			   JOIN itens_nota i
			     ON i.nota_id = n.id
			    AND LOWER(TRIM(i.item)) = LOWER(TRIM(x.produto))
			  WHERE x.encarte_id = ?`,
		)
		.bind(encarte.vigencia_inicio, fimComCarencia, encarte.id)
		.first<{ sem_preco: number; igual: number; acima: number; abaixo: number }>();

	const pessoasLista = naLista?.pessoas ?? 0;
	const pessoasCompra = compras?.pessoas ?? 0;

	return {
		ok: true,
		encarte: {
			id: encarte.id,
			vigencia_inicio: encarte.vigencia_inicio,
			vigencia_fim: encarte.vigencia_fim,
			carencia_dias: CARENCIA_DIAS,
		},
		alcance_qualificado: {
			pessoas: suprimir(pessoasLista, pessoasLista),
			produtos_ofertados: naLista?.produtos ?? 0,
			eventos: naLista?.eventos ?? 0,
		},
		captura_da_lista: {
			ofertas_vencedoras: naLista?.venceram ?? 0,
			taxa:
				naLista && naLista.eventos > 0
					? Math.round((naLista.venceram / naLista.eventos) * 1000) / 10
					: null,
		},
		buscas: {
			pessoas: suprimir(naBusca?.pessoas ?? 0, naBusca?.pessoas ?? 0),
			eventos: naBusca?.eventos ?? 0,
			nota: "Busca não é o mesmo que lista: reportado à parte de propósito.",
		},
		compra_confirmada: {
			pessoas: suprimir(pessoasCompra, pessoasCompra),
			notas: suprimir(pessoasCompra, compras?.notas ?? 0),
			itens: suprimir(pessoasCompra, compras?.itens ?? 0),
			valor_itens: suprimir(pessoasCompra, Math.round((compras?.valor_itens ?? 0) * 100) / 100),
			ticket_medio_da_visita: suprimir(
				pessoasCompra,
				compras?.ticket_medio ? Math.round(compras.ticket_medio * 100) / 100 : null,
			),
			conversao:
				protegido(pessoasLista) && protegido(pessoasCompra) && pessoasLista > 0
					? Math.round((pessoasCompra / pessoasLista) * 1000) / 10
					: null,
		},
		aderencia_de_preco: {
			igual: preco?.igual ?? 0,
			acima_do_anunciado: preco?.acima ?? 0,
			abaixo_do_anunciado: preco?.abaixo ?? 0,
			sem_preco_na_nota: preco?.sem_preco ?? 0,
		},
		privacidade: {
			piso: PISO_ANONIMATO,
			nota: `Células com menos de ${PISO_ANONIMATO} compradores voltam nulas. O lojista vê coorte, nunca pessoa.`,
		},
		metodo: {
			casamento: "EAN exato, ou nome idêntico. Nome parecido não é atribuído.",
			vies: "Subconta de propósito. O número real é igual ou maior — nunca menor.",
			incrementalidade:
				"Isto é venda atribuída, não incremental. Medir incremental exige holdout — ainda não implementado.",
		},
	};
}
