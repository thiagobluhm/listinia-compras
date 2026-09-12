/**
 * Telefone -> id interno da despensa.
 *
 * O irmão deste arquivo é `resolverUsuario()` em google-handler.ts, que faz o
 * mesmo com o 'sub' do Google. A tabela é a MESMA (`usuarios`) e o
 * `UNIQUE (provedor, provedor_sub)` já aceita 'whatsapp' — não há migration
 * aqui, só um provedor novo. Guardar o telefone em tabela própria criaria duas
 * fontes de identidade e, no dia em que as duas portas coexistirem, viraria
 * migração de dados em vez de uma linha a mais.
 *
 * IDENTIFICAR E CADASTRAR SÃO COISAS SEPARADAS, e a separação custou caro para
 * ser aprendida: em 12/09/2026 o webhook ficou vivo por quatro horas e sete
 * contatos — inclusive dois GRUPOS — foram cadastrados sem nunca terem pedido
 * nada, só por mandarem mensagem para o número. Telefone de terceiro é dado
 * pessoal; ele só entra no banco depois de um "sim".
 */

/** Só dígitos. A Z-API manda '5511999998888'; um '+' ou traço não pode virar outro usuário. */
function normalizarE164(telefone: string): string {
	return telefone.replace(/\D/g, "");
}

/**
 * Quem é o dono deste número, ou `null` se ele ainda não aceitou.
 *
 * SOMENTE LEITURA, de propósito. Quem grava é `criarUsuario`, e só depois da
 * confirmação — ver o comentário do topo.
 */
export async function buscarUsuarioPorTelefone(
	db: D1Database,
	telefone: string,
): Promise<string | null> {
	const sub = normalizarE164(telefone);
	const achado = await db
		.prepare("SELECT id FROM usuarios WHERE provedor = 'whatsapp' AND provedor_sub = ?")
		.bind(sub)
		.first<{ id: string }>();
	return achado?.id ?? null;
}

/** Cria a despensa vazia deste número. Só chamar depois do aceite explícito. */
export async function criarUsuario(db: D1Database, telefone: string): Promise<string> {
	const sub = normalizarE164(telefone);
	const id = `u_${crypto.randomUUID().replace(/-/g, "")}`;
	await db
		.prepare(
			"INSERT INTO usuarios (id, provedor, provedor_sub, email, criado_em) VALUES (?, 'whatsapp', ?, NULL, ?)",
		)
		.bind(id, sub, new Date().toISOString())
		.run();
	return id;
}

/**
 * A mensagem é um aceite?
 *
 * Deliberadamente ESTREITO. Aceitar "ok", "quero", "vamos" ou qualquer coisa
 * parecida com entusiasmo transformaria uma resposta casual em consentimento,
 * que é justamente o que este fluxo existe para impedir. Na dúvida, não é
 * aceite: o convite é repetido e a pessoa responde de novo, sem custo nenhum.
 */
export function ehAceite(texto: string): boolean {
	const limpo = texto
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z ]/g, "")
		.trim();
	return ["sim", "aceito", "sim aceito", "concordo", "pode sim", "sim quero"].includes(limpo);
}
