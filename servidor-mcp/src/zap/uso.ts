/**
 * Teto de uso por pessoa, por dia.
 *
 * O número do bot é público por natureza, então o custo é aberto: qualquer um
 * que o descubra pode gastar token nosso, e o turno roda em `waitUntil` sem
 * ninguém olhando. Este arquivo é a única trava disso.
 *
 * A contagem é de TURNOS, não de tokens — é o que se mede sem ambiguidade e
 * sem depender do provider. Se um dia o teto precisar ser em dinheiro, a chave
 * (usuário, dia) já serve de base.
 */

/**
 * Soma um turno ao dia e devolve o total DEPOIS da soma.
 *
 * Incremento e leitura numa instrução só, com `RETURNING`: ler e depois gravar
 * abriria janela para dois webhooks simultâneos lerem o mesmo valor e o teto
 * ser furado justamente sob rajada, que é quando ele importa.
 */
export async function registrarTurno(db: D1Database, userId: string, dia: string): Promise<number> {
	const r = await db
		.prepare(
			`INSERT INTO uso_diario (user_id, dia, turnos) VALUES (?, ?, 1)
			 ON CONFLICT(user_id, dia) DO UPDATE SET turnos = uso_diario.turnos + 1
			 RETURNING turnos`,
		)
		.bind(userId, dia)
		.first<{ turnos: number }>();
	return r?.turnos ?? 1;
}
