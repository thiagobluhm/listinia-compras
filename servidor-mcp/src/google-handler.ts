/**
 * Tela de consentimento + vai-e-volta com o Google.
 *
 * É o `defaultHandler` do OAuthProvider: tudo que não é /mcp cai aqui.
 * Sem Hono — o roteamento são três rotas, não vale uma dependência.
 */

import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { buscarUsuario, trocarCodigoPorToken, urlDeAutorizacao } from "./google";
import {
	addApprovedClient,
	bindStateToSession,
	createOAuthState,
	isClientApproved,
	OAuthError,
	generateCSRFProtection,
	renderApprovalDialog,
	validateCSRFToken,
	validateOAuthState,
} from "./workers-oauth-utils";

interface AuthEnv {
	DB: D1Database;
	OAUTH_KV: KVNamespace;
	OAUTH_PROVIDER: OAuthHelpers;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	COOKIE_ENCRYPTION_KEY: string;
	/** E-mail do dono dos dados anteriores ao OAuth. Ver resolverUsuario(). */
	EMAIL_DONO_LEGADO?: string;
}

/** O que a pessoa le na tela de aprovacao. Muda entre Compras e Mercado. */
export interface IdentidadeTela {
	nome: string;
	descricao: string;
}

/** O que fica no token e chega em ctx.props do lado do MCP. */
export interface PropsListinia {
	userId: string;
	email: string | null;
	nome: string | null;
}

const USUARIO_LEGADO = "u_legado";

/**
 * Traduz a identidade do Google no id interno da despensa.
 *
 * A ordem importa. O dono histórico dos dados (tudo que existe hoje está sob
 * 'u_legado') precisa cair de volta na própria despensa no primeiro login,
 * senão ele entra e encontra a casa vazia. Depois desse primeiro login o
 * vínculo já está gravado, e ele passa a ser encontrado pelo sub como
 * qualquer outra pessoa.
 */
async function resolverUsuario(
	db: D1Database,
	sub: string,
	email: string | null,
	emailDonoLegado?: string,
): Promise<string> {
	const jaVinculado = await db
		.prepare("SELECT id FROM usuarios WHERE provedor = 'google' AND provedor_sub = ?")
		.bind(sub)
		.first<{ id: string }>();
	if (jaVinculado) return jaVinculado.id;

	if (emailDonoLegado && email && email.toLowerCase() === emailDonoLegado.toLowerCase()) {
		await db
			.prepare(
				"UPDATE usuarios SET provedor = 'google', provedor_sub = ?, email = ? WHERE id = ?",
			)
			.bind(sub, email, USUARIO_LEGADO)
			.run();
		return USUARIO_LEGADO;
	}

	const id = `u_${crypto.randomUUID().replace(/-/g, "")}`;
	await db
		.prepare(
			"INSERT INTO usuarios (id, provedor, provedor_sub, email, criado_em) VALUES (?, 'google', ?, ?, ?)",
		)
		.bind(id, sub, email, new Date().toISOString())
		.run();
	return id;
}

function redirecionarAoGoogle(
	request: Request,
	env: AuthEnv,
	stateToken: string,
	cabecalhos: Headers = new Headers(),
): Response {
	cabecalhos.set(
		"Location",
		urlDeAutorizacao({
			clientId: env.GOOGLE_CLIENT_ID,
			redirectUri: new URL("/callback", request.url).href,
			state: stateToken,
		}),
	);
	return new Response(null, { status: 302, headers: cabecalhos });
}

async function autorizarGet(
	request: Request,
	env: AuthEnv,
	identidade: IdentidadeTela,
): Promise<Response> {
	const pedido = await env.OAUTH_PROVIDER.parseAuthRequest(request);
	if (!pedido.clientId) return new Response("Pedido inválido", { status: 400 });

	// Já aprovou este cliente antes: pula a tela, mas mantém o state ligado à sessão.
	if (await isClientApproved(request, pedido.clientId, env.COOKIE_ENCRYPTION_KEY)) {
		const { stateToken } = await createOAuthState(pedido, env.OAUTH_KV);
		const { setCookie } = await bindStateToSession(stateToken);
		const h = new Headers();
		h.append("Set-Cookie", setCookie);
		return redirecionarAoGoogle(request, env, stateToken, h);
	}

	const { token: csrfToken, setCookie } = generateCSRFProtection();

	return renderApprovalDialog(request, {
		client: await env.OAUTH_PROVIDER.lookupClient(pedido.clientId),
		csrfToken,
		server: {
			name: identidade.nome,
			description: identidade.descricao,
			// O sanitizeUrl so aceita http/https, entao o logo e servido pelo
			// proprio Worker em /logo.png. Montado a partir do host da
			// requisicao: funciona no workers.dev e no dominio proprio.
			logo: new URL("/logo.png", request.url).href,
		},
		setCookie,
		state: { oauthReqInfo: pedido },
	});
}

async function autorizarPost(request: Request, env: AuthEnv): Promise<Response> {
	try {
		const form = await request.formData();
		validateCSRFToken(form, request);

		const bruto = form.get("state");
		if (typeof bruto !== "string" || !bruto) {
			return new Response("State ausente no formulário", { status: 400 });
		}

		let estado: { oauthReqInfo?: AuthRequest };
		try {
			estado = JSON.parse(atob(bruto));
		} catch {
			return new Response("State inválido", { status: 400 });
		}
		if (!estado.oauthReqInfo?.clientId) {
			return new Response("Pedido inválido", { status: 400 });
		}

		const cookieAprovado = await addApprovedClient(
			request,
			estado.oauthReqInfo.clientId,
			env.COOKIE_ENCRYPTION_KEY,
		);
		const { stateToken } = await createOAuthState(estado.oauthReqInfo, env.OAUTH_KV);
		const { setCookie } = await bindStateToSession(stateToken);

		const h = new Headers();
		h.append("Set-Cookie", cookieAprovado);
		h.append("Set-Cookie", setCookie);

		return redirecionarAoGoogle(request, env, stateToken, h);
	} catch (erro: unknown) {
		if (erro instanceof OAuthError) return erro.toResponse();
		console.error("POST /authorize:", erro);
		return new Response("Erro interno", { status: 500 });
	}
}

async function retorno(request: Request, env: AuthEnv): Promise<Response> {
	let pedido: AuthRequest;
	let limparCookie: string;
	try {
		const r = await validateOAuthState(request, env.OAUTH_KV);
		pedido = r.oauthReqInfo;
		limparCookie = r.clearCookie;
	} catch (erro: unknown) {
		if (erro instanceof OAuthError) return erro.toResponse();
		console.error("GET /callback:", erro);
		return new Response("Erro interno", { status: 500 });
	}

	if (!pedido.clientId) return new Response("Pedido inválido", { status: 400 });

	const url = new URL(request.url);
	const [accessToken, erroToken] = await trocarCodigoPorToken({
		clientId: env.GOOGLE_CLIENT_ID,
		clientSecret: env.GOOGLE_CLIENT_SECRET,
		code: url.searchParams.get("code"),
		redirectUri: new URL("/callback", request.url).href,
	});
	if (erroToken) return erroToken;

	const [usuario, erroPerfil] = await buscarUsuario(accessToken);
	if (erroPerfil) return erroPerfil;

	// O vínculo com os dados antigos é feito por e-mail. E-mail não verificado
	// não serve de identidade — recusa em vez de arriscar entregar a despensa
	// de alguém para outra pessoa.
	if (usuario.email && !usuario.email_verified) {
		return new Response("Seu e-mail do Google não está verificado.", { status: 403 });
	}

	const userId = await resolverUsuario(
		env.DB,
		usuario.sub,
		usuario.email,
		env.EMAIL_DONO_LEGADO,
	);

	const props: PropsListinia = { userId, email: usuario.email, nome: usuario.name };

	const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
		request: pedido,
		scope: pedido.scope,
		userId,
		metadata: { label: usuario.name ?? usuario.email ?? userId },
		props,
	});

	const h = new Headers({ Location: redirectTo });
	if (limparCookie) h.set("Set-Cookie", limparCookie);
	return new Response(null, { status: 302, headers: h });
}

export function criarGoogleHandler(identidade: IdentidadeTela) {
	return {
		async fetch(request: Request, env: AuthEnv, _ctx?: ExecutionContext): Promise<Response> {
			const { pathname } = new URL(request.url);
			if (pathname === "/authorize") {
				if (request.method === "GET") return autorizarGet(request, env, identidade);
				if (request.method === "POST") return autorizarPost(request, env);
				return new Response("Método não permitido", { status: 405 });
			}
			if (pathname === "/callback" && request.method === "GET") return retorno(request, env);
			return new Response("Not found", { status: 404 });
		},
	};
}
