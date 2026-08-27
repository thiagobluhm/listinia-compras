/**
 * Tudo que não é /mcp passa por aqui.
 *
 * Duas famílias de rota, com autenticações diferentes de propósito:
 *   /v1/*        → chave de API do estabelecimento (o ERP do lojista)
 *   /authorize,
 *   /callback    → OAuth com Google (a pessoa)
 *
 * Manter as duas separadas desde o primeiro dia é o que permite mover o lado
 * lojista para outro Worker depois sem migration nenhuma.
 */

import { estabelecimentoPorChave, publicarEncarte } from "./encartes";
import { GoogleHandler } from "./google-handler";

interface EnvPublico {
	DB: D1Database;
	[k: string]: unknown;
}

function json(corpo: unknown, status = 200, extra: Record<string, string> = {}) {
	return new Response(JSON.stringify(corpo, null, 2), {
		status,
		headers: { "Content-Type": "application/json; charset=utf-8", ...extra },
	});
}

/**
 * POST /v1/encarte — a mesma publicação do chat, sem passar pela Claude.
 *
 * É a porta para o ERP do supermercado, um cron ou uma pasta monitorada.
 * Nós não construímos a automação; só não fechamos a porta para ela.
 */
async function publicarPorHttp(request: Request, env: EnvPublico): Promise<Response> {
	const auth = request.headers.get("Authorization") ?? "";
	const chave = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
	if (!chave) {
		return json({ erro: "informe a chave do estabelecimento em Authorization: Bearer" }, 401, {
			"WWW-Authenticate": 'Bearer realm="listinia-encartes"',
		});
	}

	const loja = await estabelecimentoPorChave(env.DB, chave);
	if (!loja) return json({ erro: "chave inválida ou estabelecimento inativo" }, 403);

	let corpo: Record<string, unknown>;
	try {
		corpo = (await request.json()) as Record<string, unknown>;
	} catch {
		return json({ erro: "corpo não é JSON válido" }, 400);
	}

	const itens = corpo.itens;
	if (!Array.isArray(itens) || itens.length === 0) {
		return json({ erro: "itens ausente ou vazio" }, 400);
	}

	// Header vence o corpo: quem faz retry costuma repetir o header, não o JSON.
	const idempotency =
		request.headers.get("Idempotency-Key") ??
		(typeof corpo.idempotency_key === "string" ? corpo.idempotency_key : null);

	const r = await publicarEncarte(env.DB, loja.id, {
		vigencia_inicio: String(corpo.vigencia_inicio ?? ""),
		vigencia_fim: String(corpo.vigencia_fim ?? ""),
		itens,
		substituir_vigente: corpo.substituir_vigente !== false,
		idempotency_key: idempotency,
	});

	return json({ ...r, estabelecimento: loja.nome }, r.ok ? 200 : 422);
}

/**
 * O Worker de Compras nao abre a porta do ERP: rotaErp: false faz /v1/encarte
 * simplesmente nao existir la, em vez de existir e recusar.
 */
export function criarHandlerPadrao(opcoes: { rotaErp: boolean }) {
	return {
		async fetch(request: Request, env: EnvPublico, ctx: ExecutionContext): Promise<Response> {
			const { pathname } = new URL(request.url);

			if (opcoes.rotaErp && pathname === "/v1/encarte") {
				if (request.method !== "POST") {
					return json({ erro: "use POST" }, 405, { Allow: "POST" });
				}
				return publicarPorHttp(request, env);
			}

			return GoogleHandler.fetch(request, env as never, ctx);
		},
	};
}
