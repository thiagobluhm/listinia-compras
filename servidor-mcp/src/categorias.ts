/**
 * Categorias e duração de estoque.
 * Portado da tabela do plugin Listinia (categorizer.py / config.py).
 * A ordem importa: a primeira keyword que bater vence.
 */

export interface Categoria {
	nome: string;
	dias: number;
	keywords: string[];
}

export const CATEGORIAS: Categoria[] = [
	{
		nome: "carnes & aves",
		dias: 7,
		keywords: [
			"bife", "carne", "frango", "alcatra", "patinho", "picanha", "costela",
			"linguica", "salsicha", "bacon", "presunto", "coxao", "contrafile",
			"sobrecoxa", "coxa", "asa", "peru", "cordeiro", "porco", "suino",
			"toucinho", "musculo", "file",
		],
	},
	{
		nome: "hortifrúti",
		dias: 5,
		keywords: [
			"tomate", "alface", "cebola", "alho", "cenoura", "batata", "beterraba",
			"abobrinha", "berinjela", "pimentao", "brocolis", "couve", "espinafre",
			"pepino", "milho", "mandioca", "repolho", "rucula", "banana", "maca",
			"laranja", "limao", "abacaxi", "manga", "melao", "melancia", "uva",
			"pera", "morango", "mamao", "coco", "abacate", "acelga", "chuchu",
			"quiabo", "vagem", "salsa", "coentro", "cebolinha", "gengibre",
			"tangerina", "pitaya", "goiaba", "maracuja", "kiwi", "ameixa",
		],
	},
	{
		nome: "laticínios",
		dias: 10,
		keywords: [
			"leite", "queijo", "iogurte", "manteiga", "creme de leite", "requeijao",
			"nata", "coalhada", "minas", "prato", "mucarela", "mussarela",
			"catupiry", "cottage", "parmesao", "ricota", "danone", "activia",
		],
	},
	{
		nome: "padaria",
		dias: 5,
		keywords: [
			"pao", "baguete", "bisnaga", "croissant", "bolo", "torta", "rosca",
			"broa", "pao de queijo", "tapioca", "torrada", "ciabatta",
		],
	},
	{
		nome: "congelados",
		dias: 30,
		keywords: [
			"congelado", "nugget", "empanado", "lasanha", "pizza", "file de peixe",
			"camarao", "lula", "sorvete", "acai", "polpa",
		],
	},
	{
		nome: "bebidas",
		dias: 14,
		keywords: [
			"agua", "suco", "refrigerante", "cerveja", "vinho", "energetico",
			"isotonico", "cha", "cafe", "achocolatado", "coca", "guarana",
		],
	},
	{
		nome: "mercearia",
		dias: 30,
		keywords: [
			"arroz", "feijao", "macarrao", "massa", "farinha", "acucar", "sal",
			"oleo", "azeite", "vinagre", "molho", "ketchup", "maionese", "mostarda",
			"extrato", "catchup", "milho para pipoca", "flocos de milho",
			"uva passas", "banana passas", "passas", "pipoca", "leite em po",
			"leite condensado", "tempero", "caldo", "atum", "sardinha", "milho verde", "ervilha",
			"palmito", "azeitona", "geleia", "mel", "aveia", "granola", "cereal",
			"lentilha", "grao de bico", "amendoim", "quinoa", "canjica", "fuba",
		],
	},
	{
		nome: "biscoitos & salgadinhos",
		dias: 21,
		keywords: [
			"biscoito", "bolacha", "salgadinho", "chips", "wafer", "cream cracker",
		],
	},
	{
		nome: "limpeza",
		dias: 45,
		keywords: [
			"sabao", "detergente", "amaciante", "agua sanitaria", "alvejante",
			"desinfetante", "multiuso", "esponja", "la de aco", "papel toalha",
			"rodo", "vassoura", "saco de lixo", "inseticida", "repelente",
			"ativ cach", "ativado",
		],
	},
	{
		nome: "higiene & perfumaria",
		dias: 45,
		keywords: [
			"shampoo", "condicionador", "sabonete", "creme dental", "fio dental",
			"enxaguante", "escova de dente", "desodorante", "absorvente",
			"hidratante", "protetor solar", "papel higienico", "algodao",
			"cotonete", "gel dental",
		],
	},
	{
		nome: "pet",
		dias: 30,
		keywords: [
			"racao", "petisco", "areia para gato", "coleira", "vermifugo",
			"antipulgas",
		],
	},
];

export const CATEGORIA_PADRAO = "outros";
export const DIAS_PADRAO = 14;

/** Remove acentos e baixa a caixa, para comparar keyword com nome de produto. */
export function normalizar(texto: string): string {
	return texto
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

/**
 * Índice de busca: cada keyword vira um regex de PALAVRA INTEIRA.
 *
 * Sem isso, "pera" casa dentro de "Cepêra" e um ketchup vira fruta —
 * foi exatamente o que aconteceu com "Catchup Cepêra Zero".
 * Compilado uma vez, no carregamento do módulo.
 */
const INDICE: { re: RegExp; tam: number; cat: string }[] = CATEGORIAS.flatMap((cat) =>
	cat.keywords.map((kw) => ({
		re: new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`),
		tam: kw.length,
		cat: cat.nome,
	})),
);

/**
 * Classifica um produto.
 *
 * 1. Só casa palavra inteira (ver INDICE acima).
 * 2. Vence a keyword que aparece MAIS CEDO no nome — nome de produto no
 *    Brasil começa pelo substantivo principal ("Molho de Tomate",
 *    "Polpa de Morango"), então a primeira palavra reconhecida diz o que
 *    a coisa é.
 * 3. Empate na posição: vence a keyword mais longa, que é a mais
 *    específica ("milho para pipoca" ganha de "milho").
 */
export function classificar(item: string): string {
	const alvo = normalizar(item);
	let melhor: { pos: number; tam: number; cat: string } | null = null;

	for (const entrada of INDICE) {
		const m = entrada.re.exec(alvo);
		if (!m) continue;
		const pos = m.index;
		if (!melhor || pos < melhor.pos || (pos === melhor.pos && entrada.tam > melhor.tam)) {
			melhor = { pos, tam: entrada.tam, cat: entrada.cat };
		}
	}

	return melhor ? melhor.cat : CATEGORIA_PADRAO;
}

/** Quantos dias um item dessa categoria costuma durar. */
export function duracaoCategoria(categoria: string): number {
	const cat = CATEGORIAS.find((c) => c.nome === categoria);
	return cat ? cat.dias : DIAS_PADRAO;
}

/**
 * Dias restantes de estoque e status, a partir do estado atual do produto.
 * dias_totais    = max(1, round((q / cm) * duracao_categoria))
 * previsao_fim   = ultima_compra + dias_totais
 * dias_restantes = max(0, previsao_fim - hoje)
 */
export function calcularEstoque(
	quantidade: number,
	consumoMedio: number | null,
	categoria: string,
	ultimaCompra: string | null,
	hoje: string,
): { diasRestantes: number | null; status: string } {
	if (!ultimaCompra || !consumoMedio || consumoMedio <= 0) {
		return { diasRestantes: null, status: "desconhecido" };
	}

	const duracao = duracaoCategoria(categoria);
	const diasTotais = Math.max(1, Math.round((quantidade / consumoMedio) * duracao));

	const inicio = Date.parse(`${ultimaCompra}T00:00:00Z`);
	const agora = Date.parse(`${hoje}T00:00:00Z`);
	if (Number.isNaN(inicio) || Number.isNaN(agora)) {
		return { diasRestantes: null, status: "desconhecido" };
	}

	const decorridos = Math.floor((agora - inicio) / 86_400_000);
	const diasRestantes = Math.max(0, diasTotais - decorridos);

	const proporcao = diasRestantes / duracao;
	let status: string;
	if (proporcao < 0.25) status = "crítico";
	else if (proporcao <= 0.6) status = "baixo";
	else status = "ok";

	return { diasRestantes, status };
}
