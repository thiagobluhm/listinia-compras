/**
 * A borda da Z-API — o único arquivo que sabe que o canal é a Z-API.
 *
 * Z-API é API não-oficial: banimento do número é *quando*, não *se*. Quando
 * acontecer, a troca pela Cloud API oficial da Meta precisa ser este arquivo e
 * mais nada. Por isso o resto do harness só enxerga `receber()`, `responder()`
 * e o tipo `MensagemRecebida` — nunca o formato do webhook.
 */

export interface MensagemRecebida {
	/** Telefone do remetente em E.164, sem '+'. É a identidade do usuário. */
	telefone: string;
	/** Texto da mensagem. Vazio quando a mensagem é só mídia. */
	texto: string;
	/** URL da imagem, quando houver. O cupom fiscal chega por aqui. */
	imagemUrl: string | null;
}

export interface ZapiConfig {
	instancia: string;
	token: string;
	clientToken: string;
}

/**
 * Traduz o webhook da Z-API na forma que o harness entende.
 *
 * Devolve `null` para tudo que não é mensagem de entrada de uma pessoa — eco
 * das nossas próprias respostas, recibo de entrega, status de conexão. Sem esse
 * filtro o bot responde a si mesmo em loop.
 */
export async function receber(request: Request): Promise<MensagemRecebida | null> {
	const corpo = (await request.json()) as Record<string, unknown>;

	if (corpo.fromMe === true) return null;
	if (corpo.type !== "ReceivedCallback") return null;

	const telefone = typeof corpo.phone === "string" ? corpo.phone : null;
	if (!telefone) return null;

	const texto = corpo.text as { message?: string } | undefined;
	const imagem = corpo.image as { imageUrl?: string } | undefined;

	return {
		telefone,
		texto: texto?.message ?? "",
		imagemUrl: imagem?.imageUrl ?? null,
	};
}

/** Manda uma resposta de texto de volta para o número. */
export async function responder(cfg: ZapiConfig, telefone: string, texto: string): Promise<void> {
	const url = `https://api.z-api.io/instances/${cfg.instancia}/token/${cfg.token}/send-text`;
	const resposta = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Client-Token": cfg.clientToken,
		},
		body: JSON.stringify({ phone: telefone, message: texto }),
	});

	// Nunca repasse o corpo do erro adiante: a URL carrega o token da instância
	// e ele reapareceria em log. O status já diz o que precisa ser sabido.
	if (!resposta.ok) {
		throw new Error(`Z-API recusou o envio (HTTP ${resposta.status})`);
	}
}
