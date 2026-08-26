/**
 * As ferramentas de encarte e oferta.
 *
 * As de encarte são do lojista: identificado pela conta que ele usou para
 * entrar, cruzada com estabelecimentos.dono_user_id. As de oferta são do
 * consumidor e não exigem loja nenhuma — qualquer usuário logado consulta.
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { desempenhoEncarte, normalizarNome } from "./desempenho";
import {
	buscarOfertas,
	estabelecimentoDoUsuario,
	itensDoEncarte,
	listarEncartes,
	ofertasParaLista,
	publicarEncarte,
	removerEncarte,
	sha256Hex,
} from "./encartes";

function texto(valor: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(valor, null, 2) }] };
}

function erro(mensagem: string) {
	return { content: [{ type: "text" as const, text: `ERRO: ${mensagem}` }], isError: true };
}

const semLoja =
	"Esta conta não administra nenhum estabelecimento. Registre um com estabelecimento_registrar antes de publicar encarte.";

function novaChave(): string {
	const b = crypto.getRandomValues(new Uint8Array(24));
	return `lk_${[...b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

const itemEncarteSchema = z.object({
	produto: z.string().describe("Nome como o cliente vê na gôndola"),
	preco: z.number().describe("Preço promocional, em reais"),
	unidade: z.string().default("un").describe("un, kg, g, L, ml, pct, cx, dz"),
	marca: z.string().optional(),
	preco_de: z.number().nullable().optional().describe("Preço normal, para mostrar o desconto"),
	ean: z.string().nullable().optional().describe("Código de barras — aumenta muito a precisão"),
	categoria: z.string().optional().describe("Se omitida, fica sem categoria"),
	limite_por_cliente: z.number().int().nullable().optional(),
	observacao: z.string().nullable().optional().describe("'leve 3 pague 2', 'só na loja Centro'"),
});

export function registrarToolsEncartes(server: McpServer, db: D1Database, userId: string) {
	// ------------------------------------------------------------- LOJISTA
	server.registerTool(
		"estabelecimento_registrar",
		{
			description:
				"Registra o estabelecimento (mercado, farmácia ou outro ramo) desta conta e devolve a chave de API usada por integração automática. A chave é mostrada UMA vez.",
			inputSchema: z.object({
				tipo: z.string().describe("'mercado', 'farmacia' ou outro tipo já cadastrado"),
				nome: z.string().min(1),
				cnpj: z.string().optional(),
				cidade: z.string().optional(),
				uf: z.string().optional(),
			}),
		},
		async ({ tipo, nome, cnpj, cidade, uf }) => {
			const tipoOk = await db
				.prepare("SELECT tipo FROM tipos_negocio WHERE tipo = ?")
				.bind(tipo)
				.first();
			if (!tipoOk) {
				const { results } = await db.prepare("SELECT tipo FROM tipos_negocio").all();
				return erro(
					`tipo "${tipo}" não existe. Disponíveis: ${results.map((r) => (r as { tipo: string }).tipo).join(", ")}`,
				);
			}

			const jaTem = await estabelecimentoDoUsuario(db, userId);
			if (jaTem) return erro(`esta conta já administra "${jaTem.nome}"`);

			const chave = novaChave();
			const id = `e_${crypto.randomUUID().replace(/-/g, "")}`;
			await db
				.prepare(
					`INSERT INTO estabelecimentos
					   (id, tipo, nome, nome_normalizado, cnpj, cidade, uf, api_key_hash, dono_user_id, ativo, criado_em)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
				)
				.bind(
					id,
					tipo,
					nome,
					normalizarNome(nome),
					cnpj ?? null,
					cidade ?? null,
					uf ?? null,
					await sha256Hex(chave),
					userId,
					new Date().toISOString(),
				)
				.run();

			return texto({
				ok: true,
				estabelecimento_id: id,
				nome,
				tipo,
				api_key: chave,
				aviso:
					"Guarde esta chave agora — ela não é mostrada de novo. Serve para publicar encarte por integração (POST /v1/encarte). Perdeu, gere outra com estabelecimento_nova_chave.",
			});
		},
	);

	server.registerTool(
		"estabelecimento_nova_chave",
		{
			description:
				"Gera uma chave de API nova para o estabelecimento desta conta e invalida a anterior. Use quando a chave vazou ou foi perdida.",
			inputSchema: z.object({}),
		},
		async () => {
			const loja = await estabelecimentoDoUsuario(db, userId);
			if (!loja) return erro(semLoja);
			const chave = novaChave();
			await db
				.prepare("UPDATE estabelecimentos SET api_key_hash = ? WHERE id = ?")
				.bind(await sha256Hex(chave), loja.id)
				.run();
			return texto({
				ok: true,
				api_key: chave,
				aviso: "A chave anterior parou de funcionar agora. Atualize a integração.",
			});
		},
	);

	server.registerTool(
		"encarte_publicar",
		{
			description:
				"Publica o encarte do estabelecimento desta conta. Por padrão substitui o encarte vigente — o anterior sai do ar só depois que o novo entrou inteiro. Devolve o que foi gravado e o que foi rejeitado, linha a linha.",
			inputSchema: z.object({
				vigencia_inicio: z.string().describe("AAAA-MM-DD"),
				vigencia_fim: z.string().describe("AAAA-MM-DD"),
				itens: z.array(itemEncarteSchema).min(1),
				substituir_vigente: z
					.boolean()
					.default(true)
					.describe("false publica junto com o encarte atual, sem tirar o anterior do ar"),
				idempotency_key: z
					.string()
					.nullable()
					.optional()
					.describe("String estável derivada do arquivo (ex.: hash). Evita publicar duas vezes."),
			}),
		},
		async (args) => {
			const loja = await estabelecimentoDoUsuario(db, userId);
			if (!loja) return erro(semLoja);
			const r = await publicarEncarte(db, loja.id, args);
			return texto({ ...r, estabelecimento: loja.nome });
		},
	);

	server.registerTool(
		"encarte_remover",
		{
			description:
				"Apaga um encarte e seus itens de vez. Para só tirar do ar, publique outro — a substituição preserva o histórico de preço.",
			inputSchema: z.object({ encarte_id: z.number().int() }),
		},
		async ({ encarte_id }) => {
			const loja = await estabelecimentoDoUsuario(db, userId);
			if (!loja) return erro(semLoja);
			return texto(await removerEncarte(db, loja.id, encarte_id));
		},
	);

	server.registerTool(
		"encarte_listar",
		{
			description: "Encartes já publicados por este estabelecimento, do mais recente ao mais antigo.",
			inputSchema: z.object({ limite: z.number().int().min(1).max(100).default(20) }),
		},
		async ({ limite }) => {
			const loja = await estabelecimentoDoUsuario(db, userId);
			if (!loja) return erro(semLoja);
			return texto(await listarEncartes(db, loja.id, limite));
		},
	);

	server.registerTool(
		"encarte_itens",
		{
			description: "Itens de um encarte específico, para conferência.",
			inputSchema: z.object({ encarte_id: z.number().int() }),
		},
		async ({ encarte_id }) => {
			const loja = await estabelecimentoDoUsuario(db, userId);
			if (!loja) return erro(semLoja);
			return texto(await itensDoEncarte(db, loja.id, encarte_id));
		},
	);

	// ---------------------------------------------------------- CONSUMIDOR
	server.registerTool(
		"ofertas_buscar",
		{
			description:
				"Procura um produto nos encartes vigentes de todos os estabelecimentos, do mais barato para o mais caro. Substitui a varredura de sites.",
			inputSchema: z.object({
				termo: z.string().min(1).describe("Trecho do nome do produto"),
				tipo: z.string().optional().describe("Filtra por ramo: 'mercado', 'farmacia'..."),
				cidade: z.string().optional(),
				limite: z.number().int().min(1).max(100).default(30),
			}),
		},
		async ({ termo, tipo, cidade, limite }) =>
			texto(await buscarOfertas(db, termo, { tipo, cidade, limite, userId })),
	);

	server.registerTool(
		"ofertas_por_lista",
		{
			description:
				"Cruza uma lista de compras inteira com os encartes vigentes e devolve o mais barato por item, mais o total estimado. Item sem oferta volta como 'sem cotação' — nunca com preço estimado.",
			inputSchema: z.object({
				itens: z.array(z.string()).min(1).describe("Nomes dos produtos da lista"),
				tipo: z.string().optional(),
				cidade: z.string().optional(),
			}),
		},
		async ({ itens, tipo, cidade }) =>
			texto(await ofertasParaLista(db, itens, { tipo, cidade, userId })),
	);

	// ------------------------------------------------------- DESEMPENHO
	server.registerTool(
		"desempenho_encarte",
		{
			description:
				"Relatório de desempenho de um encarte: alcance qualificado, captura da lista, compras confirmadas por nota fiscal e aderência de preço. Números de coorte, nunca de pessoa. Só o dono do estabelecimento consulta.",
			inputSchema: z.object({
				encarte_id: z
					.number()
					.int()
					.optional()
					.describe("Se omitido, usa o encarte mais recente"),
			}),
		},
		async ({ encarte_id }) => {
			const loja = await estabelecimentoDoUsuario(db, userId);
			if (!loja) return erro(semLoja);
			return texto({
				estabelecimento: loja.nome,
				...(await desempenhoEncarte(db, loja.id, { encarte_id })),
			});
		},
	);

	server.registerTool(
		"estabelecimento_apelido_adicionar",
		{
			description:
				"Cadastra como o nome da loja sai impresso no cupom fiscal, para que as compras dos clientes passem a ser atribuídas a ela. Sem isso, a nota traz um nome que não casa com o cadastro e a compra não é contabilizada.",
			inputSchema: z.object({
				nome_no_cupom: z
					.string()
					.min(1)
					.describe("Exatamente como aparece na nota, ex.: 'BOM PRECO COM DE ALIM LTDA'"),
			}),
		},
		async ({ nome_no_cupom }) => {
			const loja = await estabelecimentoDoUsuario(db, userId);
			if (!loja) return erro(semLoja);
			const norm = normalizarNome(nome_no_cupom);
			if (!norm) return erro("nome vazio depois de normalizar");
			const dono = await db
				.prepare("SELECT estabelecimento_id FROM estabelecimento_apelidos WHERE nome_normalizado = ?")
				.bind(norm)
				.first<{ estabelecimento_id: string }>();
			if (dono && dono.estabelecimento_id !== loja.id) {
				return erro("este nome já está vinculado a outro estabelecimento");
			}
			await db
				.prepare(
					"INSERT OR REPLACE INTO estabelecimento_apelidos (nome_normalizado, estabelecimento_id, criado_em) VALUES (?, ?, ?)",
				)
				.bind(norm, loja.id, new Date().toISOString())
				.run();
			return texto({ ok: true, apelido: nome_no_cupom, estabelecimento: loja.nome });
		},
	);
}
