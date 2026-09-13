/**
 * A memória de conversa do zap.
 *
 * Sem isto, o produto pergunta e esquece a resposta. Não é uma melhoria de
 * conforto: o desenho da identidade da loja (dois workers, um judge, e uma
 * PERGUNTA quando eles discordam) só fecha se existir um segundo turno que
 * lembre do primeiro. Ver o porquê medido em `migracao-zap-conversa.sql`.
 *
 * Só TEXTO entra aqui. A foto de um turno passado vira um marcador — o modelo
 * não precisa rever a imagem para lembrar do que leu nela, porque a própria
 * leitura dele está no histórico.
 */

/** Quantas mensagens do passado vão junto no turno. Seis idas e voltas. */
const JANELA = 12;

/** Depois disso, o passado antigo desta pessoa é apagado. */
const GUARDAR = 40;

export interface FalaGravada {
	papel: "user" | "assistant";
	texto: string;
}

/** As últimas mensagens desta pessoa, da mais antiga para a mais nova. */
export async function carregarConversa(db: D1Database, userId: string): Promise<FalaGravada[]> {
	const r = await db
		.prepare(
			`SELECT papel, texto FROM conversa_zap
			 WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
		)
		.bind(userId, JANELA)
		.all<{ papel: string; texto: string }>();
	// Vem em ordem decrescente porque "as últimas N" se pede assim; o modelo
	// precisa delas em ordem de conversa.
	return (r.results ?? [])
		.map((l) => ({ papel: l.papel === "assistant" ? "assistant" : "user", texto: l.texto }) as FalaGravada)
		.reverse();
}

/**
 * Grava o par pergunta/resposta do turno e poda o passado antigo.
 *
 * As duas falas juntas, numa chamada só: gravar a da pessoa antes do turno
 * deixaria pergunta órfã no histórico toda vez que o modelo falhasse — e
 * histórico com pergunta sem resposta ensina o modelo a não responder.
 *
 * Nunca derruba o turno: a pessoa já recebeu a resposta quando isto roda, e
 * perder o registro é menos grave do que transformar um turno bem-sucedido em
 * erro.
 */
export async function gravarTurno(
	db: D1Database,
	userId: string,
	daPessoa: string,
	doBot: string,
): Promise<void> {
	const agora = new Date().toISOString();
	try {
		await db.batch([
			db
				.prepare(
					"INSERT INTO conversa_zap (user_id, papel, texto, criada_em) VALUES (?, 'user', ?, ?)",
				)
				.bind(userId, daPessoa, agora),
			db
				.prepare(
					"INSERT INTO conversa_zap (user_id, papel, texto, criada_em) VALUES (?, 'assistant', ?, ?)",
				)
				.bind(userId, doBot, agora),
			db
				.prepare(
					`DELETE FROM conversa_zap WHERE user_id = ? AND id NOT IN (
					   SELECT id FROM conversa_zap WHERE user_id = ? ORDER BY id DESC LIMIT ?
					 )`,
				)
				.bind(userId, userId, GUARDAR),
		]);
	} catch (e) {
		console.error(`conversa nao gravada: ${(e as Error).name}`);
	}
}
