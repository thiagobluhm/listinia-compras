/**
 * Fabrica o Worker de um perfil do Listinia.
 *
 * Os dois perfis (compras e mercado) sobem como Workers separados, em hosts
 * separados, sobre o MESMO D1 e o MESMO KV de OAuth. O que muda entre eles e
 * só o conjunto de ferramentas, os escopos e o resource metadata — nada de
 * schema, nada de migration.
 */

import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { env as envModulo } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { criarHandlerPadrao } from "./handler-padrao";
import { type IdentidadeTela, type PropsListinia } from "./google-handler";
import type { ListiniaEnv } from "./tipos";

export interface PerfilWorker {
	/** Nome do servidor MCP anunciado no handshake. */
	nome: string;
	versao: string;
	/** URL publica do endpoint /mcp, usada se MCP_RESOURCE nao vier do ambiente. */
	resourcePadrao: string;
	resourceName: string;
	/** O que a pessoa le na tela de aprovacao do OAuth. */
	identidade: IdentidadeTela;
	escopos: string[];
	/** Expoe POST /v1/encarte (a porta do ERP do lojista). So o perfil mercado. */
	rotaErp: boolean;
	registrar: (server: McpServer, db: D1Database, userId: string) => void;
}

export function criarWorker(perfil: PerfilWorker) {
	function createServer(env: ListiniaEnv, userId: string) {
		const server = new McpServer({ name: perfil.nome, version: perfil.versao });
		perfil.registrar(server, env.DB, userId);
		return server;
	}

	/**
	 * So recebe requisicao ja autenticada — o OAuthProvider valida o bearer antes
	 * e entrega a identidade em ctx.props. Se props nao vier, alguma coisa esta
	 * errada na configuracao: recusa em vez de servir a despensa de ninguem.
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

	// offline_access aqui e o que faz a Claude pedir refresh token. Sem ele, a
	// pessoa reautoriza toda hora que o access token expira.
	const escopos = [...perfil.escopos, "offline_access"];

	return new OAuthProvider({
		apiRoute: "/mcp",
		apiHandler: mcpApiHandler,
		defaultHandler: criarHandlerPadrao({
			rotaErp: perfil.rotaErp,
			identidade: perfil.identidade,
		}),

		authorizeEndpoint: "/authorize",
		tokenEndpoint: "/token",
		clientRegistrationEndpoint: "/register",

		scopesSupported: escopos,

		resourceMetadata: {
			// Precisa bater EXATAMENTE com a URL que a pessoa digita na Claude,
			// path incluido. Sem o /mcp, a descoberta falha.
			resource:
				(envModulo as { MCP_RESOURCE?: string }).MCP_RESOURCE ?? perfil.resourcePadrao,
			resource_name: perfil.resourceName,
			scopes_supported: perfil.escopos,
		},
	});
}
