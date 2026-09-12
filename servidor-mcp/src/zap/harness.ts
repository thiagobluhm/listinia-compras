/**
 * O harness: o que acontece entre a mensagem chegar e a resposta sair.
 *
 * A chamada do modelo está atrás de UMA função (`chamarModelo`), e é de
 * propósito: o provider ainda não está decidido (Anthropic + Tool Runner ×
 * OpenAI-compatible via OpenRouter), e enquanto ele estiver atrás desta função
 * trocar de provider é mexer num arquivo, não reescrever o produto.
 *
 * Nesta primeira leva `chamarModelo` NÃO chama modelo nenhum: devolve um
 * diagnóstico do encanamento. Dá para rodar `wrangler dev`, mandar mensagem e
 * ver identidade e ferramentas funcionando sem gastar token nem ter chave.
 */

import { abrirFerramentas, type FerramentaLLM } from "./ferramentas";
import { resolverUsuarioPorTelefone } from "./identidade";
import type { MensagemRecebida } from "./zapi";

/**
 * A regra `jamais-inventar`, que nos plugins é carregada pelos 10 agentes.
 *
 * No WhatsApp não existem agentes — existe este system prompt e mais nada. Se
 * ele sair daqui, o produto vira "só a URL": `nota_registrar` e
 * `produto_salvar` gravam igual, sem trava, e a pessoa do zap não tem como
 * saber que há um modelo adivinhando preço. O texto completo e o porquê estão
 * em plugins/listinia-compras/references/jamais-inventar.md e em PLUGINS.md:115.
 */
export const SYSTEM_PROMPT = `Você é o Listinia, a despensa da casa, atendendo pelo WhatsApp.

JAMAIS INVENTAR — vale sem exceção e sem "só dessa vez".
Este produto controla dinheiro e comida de uma casa. Faltar dado é sempre
melhor que ter dado falso.

É proibido:
- Preencher nome, quantidade, unidade, preço, data ou mercado que você não leu
  com clareza. Não existe "deve ser mais ou menos isso".
- Completar item parcialmente lido pelo que "costuma ser" — nem por marca, nem
  por preço de mercado, nem pelo que apareceu em outra nota.
- Recalcular de cabeça o que o servidor calcula (dias restantes, status,
  categoria, total). Se precisa do número, peça à ferramenta.
- Somar, converter unidade ou fechar total de cabeça.
- Inventar oferta, preço de encarte ou disponibilidade que você não leu.
- Apresentar suposição com cara de fato. Leitura por foto e correspondência
  aproximada de nome são sugestões a confirmar, e têm que ser ditas assim.

No lugar disso:
1. Campo não lido -> null, e diga à pessoa o que faltou, item a item.
2. Não deu para ler nada -> diga o motivo real. Não improvise outro caminho.
3. Dúvida entre duas leituras -> não escolha. Apresente as duas.
4. Suposição útil -> rotule como suposição.

Sempre diga o que ficou de fora antes de gravar qualquer coisa. Nada entra na
despensa com um buraco silencioso.

Você fala por WhatsApp: respostas curtas, sem markdown pesado, sem tabela.`;

export interface EntradaModelo {
	system: string;
	ferramentas: FerramentaLLM[];
	mensagem: MensagemRecebida;
	chamar(nome: string, argumentos: Record<string, unknown>): Promise<string>;
}

/**
 * A única costura com o provider de LLM. Ainda não ligada.
 *
 * Quando o provider for escolhido, é AQUI que entram o cliente e o loop de
 * ferramentas — nada fora deste arquivo precisa mudar. O Tool Runner do SDK da
 * Anthropic é um loop client-side sobre POST /v1/messages, então ele roda
 * dentro do Worker sem depender do MCP connector.
 */
async function chamarModelo(entrada: EntradaModelo): Promise<string> {
	const nomes = entrada.ferramentas.map((f) => f.name).join(", ");
	return [
		"Encanamento de pé — o modelo ainda não está ligado.",
		`Recebi: ${entrada.mensagem.texto || "(sem texto)"}`,
		entrada.mensagem.imagemUrl ? "Veio imagem junto." : "Sem imagem.",
		`${entrada.ferramentas.length} ferramentas disponíveis: ${nomes}`,
	].join("\n");
}

/** Mensagem entra, texto de resposta sai. Quem manda pelo canal é o entrypoint. */
export async function processarMensagem(
	db: D1Database,
	mensagem: MensagemRecebida,
): Promise<string> {
	const userId = await resolverUsuarioPorTelefone(db, mensagem.telefone);
	const ferramentas = await abrirFerramentas(db, userId);
	try {
		return await chamarModelo({
			system: SYSTEM_PROMPT,
			ferramentas: ferramentas.defs,
			mensagem,
			chamar: ferramentas.chamar,
		});
	} finally {
		await ferramentas.fechar();
	}
}
