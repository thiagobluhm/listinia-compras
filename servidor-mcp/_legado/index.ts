import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { env as envModulo } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { calcularEstoque, classificar, duracaoCategoria } from "./categorias";
import { type PropsListinia } from "./google-handler";
import { HandlerPadrao } from "./handler-padrao";
import { resolverEstabelecimento } from "./desempenho";
import { registrarToolsEncartes } from "./tools-encartes";

interface ListiniaEnv {
	DB: D1Database;
	OAUTH_KV: KVNamespace;
}

interface ProdutoRow {
	item: string;
	categoria: string;
	quantidade: number;
	unidade: string;
	consumo_medio: number | null;
	ultima_compra: string | null;
	ultimo_preco: number | null;
	atualizado_em: string;
}

interface NotaRow {
	id: number;
	data: string;
	mercado: string;
	total: number | null;
	chave: string | null;
	criada_em: string;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function hojeISO(): string {
	return new Date().toISOString().slice(0, 10);
}

function agoraISO(): string {
	return new Date().toISOString();
}

/** Só apara e colapsa espaços. O nome chega já normalizado pela skill. */
function limparNome(item: string): string {
	return item.replace(/\s+/g, " ").trim();
}

function texto(valor: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(valor, null, 2) }] };
}

function erro(mensagem: string) {
	return { content: [{ type: "text" as const, text: `ERRO: ${mensagem}` }], isError: true };
}

const itemNotaSchema = z.object({
	item: z.string().min(1).describe("Nome do produto, já normalizado e legível"),
	quantidade: z.number().describe("Quantidade comprada (peso em kg ou unidades)"),
	unidade: z.string().default("un").describe("'kg', 'un', 'L' ..."),
	categoria: z.string().optional().describe("Se omitida, é classificada automaticamente"),
	preco_unitario: z.number().nullable().optional(),
	preco_total: z.number().nullable().optional(),
});

function createServer(env: ListiniaEnv, userId: string) {
	const server = new McpServer({ name: "listinia-despensa", version: "1.0.0" });
	const db = env.DB;

	// ------------------------------------------------------------------ READ
	server.registerTool(
		"despensa_listar",
		{
			title: "Estado atual da despensa",
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			description:
				"Lista o estado atual da despensa (um registro por produto). Use para saber o que tem em casa.",
			inputSchema: z.object({
				categoria: z.string().optional().describe("Filtra por uma categoria"),
				busca: z.string().optional().describe("Filtra por trecho do nome do produto"),
				apenas_com_estoque: z.boolean().default(false),
			}),
		},
		async ({ categoria, busca, apenas_com_estoque }) => {
			const where: string[] = ["user_id = ?"];
			const binds: unknown[] = [userId];

			if (categoria) {
				where.push("categoria = ?");
				binds.push(categoria);
			}
			if (busca) {
				where.push("item LIKE ?");
				binds.push(`%${busca}%`);
			}
			if (apenas_com_estoque) where.push("quantidade > 0");

			const sql =
				"SELECT * FROM produtos" +
				(where.length ? ` WHERE ${where.join(" AND ")}` : "") +
				" ORDER BY categoria, item";

			const { results } = await db
				.prepare(sql)
				.bind(...binds)
				.all<ProdutoRow>();

			return texto({ total: results.length, produtos: results });
		},
	);

	server.registerTool(
		"despensa_status",
		{
			title: "Dias de estoque e status por produto",
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			description:
				"Calcula dias restantes de estoque e status (crítico / baixo / ok) de cada produto. Base para a lista de compras.",
			inputSchema: z.object({
				status: z
					.enum(["crítico", "baixo", "ok", "desconhecido"])
					.optional()
					.describe("Se informado, devolve só os produtos nesse status"),
			}),
		},
		async ({ status }) => {
			const { results } = await db
				.prepare("SELECT * FROM produtos WHERE user_id = ? ORDER BY categoria, item")
				.bind(userId)
				.all<ProdutoRow>();

			const hoje = hojeISO();
			const linhas = results
				.map((p) => {
					const calc = calcularEstoque(
						p.quantidade,
						p.consumo_medio,
						p.categoria,
						p.ultima_compra,
						hoje,
					);
					return {
						item: p.item,
						categoria: p.categoria,
						quantidade: p.quantidade,
						unidade: p.unidade,
						ultima_compra: p.ultima_compra,
						duracao_categoria_dias: duracaoCategoria(p.categoria),
						dias_restantes: calc.diasRestantes,
						status: calc.status,
					};
				})
				.filter((l) => (status ? l.status === status : true))
				.sort((a, b) => (a.dias_restantes ?? 9999) - (b.dias_restantes ?? 9999));

			return texto({ hoje, total: linhas.length, produtos: linhas });
		},
	);

	server.registerTool(
		"notas_listar",
		{
			title: "Notas fiscais registradas",
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			description: "Histórico de compras registradas, da mais recente para a mais antiga.",
			inputSchema: z.object({ limite: z.number().int().min(1).max(200).default(20) }),
		},
		async ({ limite }) => {
			const { results } = await db
				.prepare(
					"SELECT * FROM notas WHERE user_id = ? ORDER BY data DESC, id DESC LIMIT ?",
				)
				.bind(userId, limite)
				.all<NotaRow>();
			return texto({ total: results.length, notas: results });
		},
	);

	server.registerTool(
		"nota_itens",
		{
			title: "Itens de uma nota",
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			description: "Itens de uma nota específica, item a item.",
			inputSchema: z.object({ nota_id: z.number().int() }),
		},
		async ({ nota_id }) => {
			const { results } = await db
				.prepare(
					`SELECT i.* FROM itens_nota i
					   JOIN notas n ON n.id = i.nota_id
					  WHERE i.nota_id = ? AND n.user_id = ?
					  ORDER BY i.id`,
				)
				.bind(nota_id, userId)
				.all();
			return texto({ nota_id, total: results.length, itens: results });
		},
	);

	// --------------------------------------------------------- CREATE/UPDATE
	server.registerTool(
		"produto_salvar",
		{
			title: "Ajustar um produto da despensa",
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
			description:
				"Cria ou ajusta UM produto na despensa manualmente. Use para correções ('já usei metade do arroz'), não para registrar compras.",
			inputSchema: z.object({
				item: z.string().min(1),
				quantidade: z.number(),
				modo: z
					.enum(["definir", "somar"])
					.default("definir")
					.describe("'definir' troca a quantidade; 'somar' soma à atual"),
				categoria: z.string().optional(),
				unidade: z.string().optional(),
				consumo_medio: z.number().nullable().optional(),
				ultima_compra: z.string().optional(),
				ultimo_preco: z.number().nullable().optional(),
			}),
		},
		async (args) => {
			const item = limparNome(args.item);
			if (!item) return erro("nome do produto vazio");
			if (args.ultima_compra && !DATA_ISO.test(args.ultima_compra)) {
				return erro("ultima_compra deve estar no formato AAAA-MM-DD");
			}

			const categoria = args.categoria ?? classificar(item);
			// null = "não mexe na unidade que já está gravada"
			const unidade = args.unidade ?? null;
			const agora = agoraISO();

			const quantidadeSql =
				args.modo === "somar"
					? "produtos.quantidade + excluded.quantidade"
					: "excluded.quantidade";

			await db
				.prepare(
					`INSERT INTO produtos
					   (user_id, item, categoria, quantidade, unidade, consumo_medio, ultima_compra, ultimo_preco, atualizado_em)
					 VALUES (?, ?, ?, ?, COALESCE(?, 'un'), ?, ?, ?, ?)
					 ON CONFLICT(user_id, item) DO UPDATE SET
					   quantidade    = ${quantidadeSql},
					   categoria     = excluded.categoria,
					   unidade       = COALESCE(?, produtos.unidade),
					   consumo_medio = COALESCE(excluded.consumo_medio, produtos.consumo_medio),
					   ultima_compra = COALESCE(excluded.ultima_compra, produtos.ultima_compra),
					   ultimo_preco  = COALESCE(excluded.ultimo_preco,  produtos.ultimo_preco),
					   atualizado_em = excluded.atualizado_em`,
				)
				.bind(
					userId,
					item,
					categoria,
					args.quantidade,
					unidade,
					args.consumo_medio ?? null,
					args.ultima_compra ?? null,
					args.ultimo_preco ?? null,
					agora,
					unidade,
				)
				.run();

			const salvo = await db
				.prepare("SELECT * FROM produtos WHERE user_id = ? AND item = ?")
				.bind(userId, item)
				.first<ProdutoRow>();

			return texto({ ok: true, produto: salvo });
		},
	);

	server.registerTool(
		"nota_registrar",
		{
			title: "Registrar uma compra na despensa",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			description:
				"Registra uma compra inteira de uma vez: grava a nota, os itens, e soma tudo na despensa. É a ferramenta principal — uma chamada por nota fiscal.",
			inputSchema: z.object({
				mercado: z.string().min(1),
				data: z.string().describe("AAAA-MM-DD"),
				total: z.number().nullable().optional(),
				chave: z
					.string()
					.nullable()
					.optional()
					.describe("Chave de acesso da NFC-e. Se repetida, a nota não é gravada de novo."),
				itens: z.array(itemNotaSchema).min(1),
			}),
		},
		async ({ mercado, data, total, chave, itens }) => {
			if (!DATA_ISO.test(data)) return erro("data deve estar no formato AAAA-MM-DD");

			if (chave) {
				const existente = await db
					.prepare(
						"SELECT id, data, mercado FROM notas WHERE user_id = ? AND chave = ?",
					)
					.bind(userId, chave)
					.first<NotaRow>();
				if (existente) {
					return texto({ ok: false, motivo: "nota_ja_registrada", nota: existente });
				}
			}

			const agora = agoraISO();

			const nota = await db
				.prepare(
					"INSERT INTO notas (user_id, data, mercado, total, chave, criada_em, estabelecimento_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
				)
				.bind(
					userId,
					data,
					mercado,
					total ?? null,
					chave ?? null,
					agora,
					// Fecha o loop de atribuição. Casamento exato ou nada:
					// ligar a nota ao lojista errado é pior que não ligar.
					await resolverEstabelecimento(db, mercado),
				)
				.run();

			const notaId = nota.meta.last_row_id;

			const inserirItem = db.prepare(
				`INSERT INTO itens_nota
				   (nota_id, item, categoria, quantidade, unidade, preco_unitario, preco_total)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			);

			const aplicarProduto = db.prepare(
				`INSERT INTO produtos
				   (user_id, item, categoria, quantidade, unidade, consumo_medio, ultima_compra, ultimo_preco, atualizado_em)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(user_id, item) DO UPDATE SET
				   quantidade    = produtos.quantidade + excluded.quantidade,
				   consumo_medio = excluded.quantidade,
				   categoria     = excluded.categoria,
				   unidade       = excluded.unidade,
				   ultima_compra = excluded.ultima_compra,
				   ultimo_preco  = COALESCE(excluded.ultimo_preco, produtos.ultimo_preco),
				   atualizado_em = excluded.atualizado_em`,
			);

			const statements: D1PreparedStatement[] = [];
			for (const bruto of itens) {
				const item = limparNome(bruto.item);
				if (!item) continue;
				const categoria = bruto.categoria ?? classificar(item);
				const unidade = bruto.unidade ?? "un";

				statements.push(
					inserirItem.bind(
						notaId,
						item,
						categoria,
						bruto.quantidade,
						unidade,
						bruto.preco_unitario ?? null,
						bruto.preco_total ?? null,
					),
					aplicarProduto.bind(
						userId,
						item,
						categoria,
						bruto.quantidade,
						unidade,
						bruto.quantidade,
						data,
						bruto.preco_unitario ?? null,
						agora,
					),
				);
			}

			await db.batch(statements);

			return texto({
				ok: true,
				nota_id: notaId,
				mercado,
				data,
				itens_gravados: statements.length / 2,
				total,
			});
		},
	);

	// ---------------------------------------------------------------- DELETE
	server.registerTool(
		"produto_remover",
		{
			title: "Remover um produto da despensa",
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			description:
				"Remove um produto da despensa. Não apaga o histórico de compras — só o estado atual.",
			inputSchema: z.object({ item: z.string().min(1) }),
		},
		async ({ item }) => {
			const alvo = limparNome(item);
			const r = await db
				.prepare("DELETE FROM produtos WHERE user_id = ? AND item = ?")
				.bind(userId, alvo)
				.run();
			return texto({ ok: true, item: alvo, removido: (r.meta.changes ?? 0) > 0 });
		},
	);

	server.registerTool(
		"nota_remover",
		{
			title: "Apagar uma nota registrada",
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			description:
				"Apaga uma nota e seus itens do histórico. NÃO desfaz o que já foi somado na despensa — ajuste os produtos à mão se precisar.",
			inputSchema: z.object({ nota_id: z.number().int() }),
		},
		async ({ nota_id }) => {
			await db.batch([
				db
					.prepare(
						"DELETE FROM itens_nota WHERE nota_id IN (SELECT id FROM notas WHERE id = ? AND user_id = ?)",
					)
					.bind(nota_id, userId),
				db.prepare("DELETE FROM notas WHERE id = ? AND user_id = ?").bind(nota_id, userId),
			]);
			return texto({ ok: true, nota_id });
		},
	);

	registrarToolsEncartes(server, db, userId);

	return server;
}

/**
 * Só recebe requisição já autenticada — o OAuthProvider valida o bearer antes
 * e entrega a identidade em ctx.props. Se props não vier, alguma coisa está
 * errada na configuração: recusa em vez de servir a despensa de ninguém.
 */
const mcpApiHandler = {
	fetch(request: Request, env: ListiniaEnv, ctx: ExecutionContext) {
		const props = (ctx as ExecutionContext & { props?: PropsListinia }).props;
		if (!props?.userId) {
			return new Response("Não autenticado", { status: 401 });
		}
		return createMcpHandler(() => createServer(env, props.userId))(request, env, ctx);
	},
} satisfies ExportedHandler<ListiniaEnv>;

export default new OAuthProvider({
	apiRoute: "/mcp",
	apiHandler: mcpApiHandler,
	defaultHandler: HandlerPadrao,

	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",

	// offline_access aqui é o que faz a Claude pedir refresh token. Sem ele, a
	// pessoa reautoriza toda hora que o access token expira.
	scopesSupported: ["despensa.read", "despensa.write", "offline_access"],

	resourceMetadata: {
		// Precisa bater EXATAMENTE com a URL que a pessoa digita na Claude,
		// path incluído. Sem o /mcp, a descoberta falha.
		resource:
			(envModulo as { MCP_RESOURCE?: string }).MCP_RESOURCE ??
			"https://listinia-despensa.thiagobluhm.workers.dev/mcp",
		resource_name: "Listinia — despensa",
		scopes_supported: ["despensa.read", "despensa.write"],
	},
});
