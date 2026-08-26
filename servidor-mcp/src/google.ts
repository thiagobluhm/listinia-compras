/**
 * Conversa com o Google como provedor de identidade acima do nosso OAuth.
 *
 * Diferenças em relação ao GitHub (que é o que o template da Cloudflare usa):
 * o Google devolve JSON no /token, não form-urlencoded, e exige grant_type.
 */

export interface UsuarioGoogle {
	sub: string;
	email: string | null;
	email_verified: boolean;
	name: string | null;
}

const AUTORIZAR = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";

export function urlDeAutorizacao({
	clientId,
	redirectUri,
	state,
}: {
	clientId: string;
	redirectUri: string;
	state: string;
}): string {
	const u = new URL(AUTORIZAR);
	u.searchParams.set("client_id", clientId);
	u.searchParams.set("redirect_uri", redirectUri);
	u.searchParams.set("response_type", "code");
	u.searchParams.set("scope", "openid email profile");
	u.searchParams.set("state", state);
	// Só queremos identidade, uma vez. Sem access_type=offline: não há nada
	// para fazer depois em nome da pessoa no Google.
	u.searchParams.set("prompt", "select_account");
	return u.href;
}

export async function trocarCodigoPorToken({
	clientId,
	clientSecret,
	code,
	redirectUri,
}: {
	clientId: string;
	clientSecret: string;
	code: string | null;
	redirectUri: string;
}): Promise<[string, null] | [null, Response]> {
	if (!code) return [null, new Response("Código ausente", { status: 400 })];

	const resp = await fetch(TOKEN, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			code,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		}).toString(),
	});

	if (!resp.ok) {
		console.error("Google /token falhou:", resp.status, await resp.text());
		return [null, new Response("Falha ao trocar o código com o Google", { status: 502 })];
	}

	const dados = (await resp.json()) as { access_token?: string };
	if (!dados.access_token) {
		return [null, new Response("Google não devolveu access token", { status: 502 })];
	}
	return [dados.access_token, null];
}

export async function buscarUsuario(
	accessToken: string,
): Promise<[UsuarioGoogle, null] | [null, Response]> {
	const resp = await fetch(USERINFO, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!resp.ok) {
		console.error("Google /userinfo falhou:", resp.status, await resp.text());
		return [null, new Response("Não consegui ler seu perfil no Google", { status: 502 })];
	}

	const u = (await resp.json()) as {
		sub?: string;
		email?: string;
		email_verified?: boolean;
		name?: string;
	};

	if (!u.sub) {
		return [null, new Response("Google não devolveu identificador de usuário", { status: 502 })];
	}

	return [
		{
			sub: u.sub,
			email: u.email ?? null,
			email_verified: u.email_verified === true,
			name: u.name ?? null,
		},
		null,
	];
}
