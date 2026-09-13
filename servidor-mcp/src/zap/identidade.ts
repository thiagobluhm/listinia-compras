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

/**
 * Só dígitos, e o NONO DÍGITO canonizado. Um '+' ou traço não pode virar outro
 * usuário — e a falta do 9 também não.
 *
 * Medido no primeiro contato real (12/09/2026): a Z-API entregou
 * '558598281228', doze dígitos, sendo o número '+55 85 9 9828-1228'. O JID do
 * WhatsApp no Brasil não é estável quanto ao nono dígito: a mesma pessoa
 * aparece com ele e sem ele. Como `provedor_sub` é a chave de identidade
 * (UNIQUE (provedor, provedor_sub)), as duas grafias virariam DUAS despensas, e
 * o histórico de preço pago — o único dado deste produto que não se copia — se
 * partiria em silêncio, que é o pior jeito de quebrar.
 *
 * Canonizamos sempre para a forma COM o 9, que é o número que a pessoa
 * reconhece. Só mexemos no caso inequívoco: celular brasileiro na forma antiga
 * de oito dígitos, que começa em 6-9. Fixo começa em 2-5 e não ganha nada.
 */
function normalizarE164(telefone: string): string {
	const digitos = telefone.replace(/\D/g, "");
	const celularAntigo = digitos.match(/^55(\d{2})([6-9]\d{7})$/);
	return celularAntigo ? `55${celularAntigo[1]}9${celularAntigo[2]}` : digitos;
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
