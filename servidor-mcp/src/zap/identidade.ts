/**
 * Telefone -> id interno da despensa.
 *
 * O irmão deste arquivo é `resolverUsuario()` em google-handler.ts, que faz o
 * mesmo com o 'sub' do Google. A tabela é a MESMA (`usuarios`) e o
 * `UNIQUE (provedor, provedor_sub)` já aceita 'whatsapp' — não há migration
 * aqui, só um provedor novo. Guardar o telefone em tabela própria criaria duas
 * fontes de identidade e, no dia em que as duas portas coexistirem, viraria
 * migração de dados em vez de uma linha a mais.
 */

/** Só dígitos. A Z-API manda '5511999998888'; um '+' ou traço não pode virar outro usuário. */
function normalizarE164(telefone: string): string {
	return telefone.replace(/\D/g, "");
}

/**
 * Devolve o id interno do dono deste número, criando-o no primeiro contato.
 *
 * Diferente do fluxo do Google, aqui não existe tela de aprovação: quem manda
 * mensagem já está declarando quem é. O primeiro contato cria a despensa vazia.
 */
export async function resolverUsuarioPorTelefone(
	db: D1Database,
	telefone: string,
): Promise<string> {
	const sub = normalizarE164(telefone);

	const jaVinculado = await db
		.prepare("SELECT id FROM usuarios WHERE provedor = 'whatsapp' AND provedor_sub = ?")
		.bind(sub)
		.first<{ id: string }>();
	if (jaVinculado) return jaVinculado.id;

	const id = `u_${crypto.randomUUID().replace(/-/g, "")}`;
	await db
		.prepare(
			"INSERT INTO usuarios (id, provedor, provedor_sub, email, criado_em) VALUES (?, 'whatsapp', ?, NULL, ?)",
		)
		.bind(id, sub, new Date().toISOString())
		.run();
	return id;
}
