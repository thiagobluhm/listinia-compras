/**
 * O harness: o que acontece entre a mensagem chegar e a resposta sair.
 *
 * A chamada do modelo está atrás de UMA função (`chamarModelo`), e é de
 * propósito: enquanto ela for a única costura, trocar de provider é mexer num
 * arquivo, não reescrever o produto.
 *
 * O provider é Claude no Microsoft Foundry, pelo client dedicado do SDK — não
 * o client de primeira parte com `baseURL` trocado. O Foundry serve as duas
 * famílias no mesmo recurso, então o modelo é `var` do Worker e não constante:
 * trocar claude-opus-5 por claude-sonnet-5 ou claude-haiku-4-5 é uma linha do
 * wrangler, sem deploy de código.
 *
 * O loop de ferramentas é o Tool Runner do SDK, que roda CLIENT-SIDE: ele só
 * orquestra pedir -> executar a nossa função -> repetir. Por isso cabe dentro
 * do Worker e não depende do MCP connector, que é feature de servidor e não
 * existe em endpoint de terceiro.
 */

import { AnthropicFoundry } from "@anthropic-ai/foundry-sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { abrirFerramentas, type FerramentaLLM } from "./ferramentas";
import { buscarUsuarioPorTelefone, criarUsuario, ehAceite } from "./identidade";
import { lerQrDoCupom } from "./cupom";
import { resolverLoja, type FonteImagem, type TipoImagem } from "./estabelecimento";
import { carregarConversa, gravarTurno, type FalaGravada } from "./conversa";
import { lerPaginaNfce } from "./nfce";
import { registrarTurno } from "./uso";
import type { MensagemRecebida } from "./zapi";

/**
 * As três respostas que NÃO passam pelo modelo.
 *
 * Todas as três são casos em que gastar token seria errado, não só caro: grupo
 * é recusa de escopo, convite é pedido de consentimento, teto é defesa de
 * custo. Texto fixo também torna as três testáveis sem chave de provider.
 */
const TEXTO_GRUPO =
	"Oi! Ainda não sei trabalhar em grupo — a despensa hoje é de uma pessoa só. " +
	"Me chama no privado que eu te ajudo. 🙂";

const TEXTO_CONVITE =
	"Oi! Eu sou o Listinia, a despensa da casa no WhatsApp. 🏠\n\n" +
	"Eu guardo o que tem em casa, leio a nota do mercado, aviso o que está " +
	"acabando e comparo preço com o que você já pagou.\n\n" +
	"Para isso eu preciso guardar o seu número e o que você me contar. " +
	"Se estiver tudo bem, responde *SIM* que eu começo. " +
	"Se não responder, nada é guardado.";

const TEXTO_BOAS_VINDAS =
	"Pronto, sua despensa está criada! 🎉\n\n" +
	"Pode começar mandando a foto de uma nota fiscal, ou me dizendo o que já " +
	"tem em casa (ex: \"arroz 5 kg, café 500 g\").\n\n" +
	"Se quiser sair depois, é só pedir para apagar seus dados.";

const TEXTO_TETO =
	"Por hoje chegamos no limite de mensagens. 😅 Amanhã eu volto a responder " +
	"normalmente — sua despensa continua guardadinha.";

/**
 * A regra `jamais-inventar`, que nos plugins é carregada pelos 10 agentes.
 *
 * No WhatsApp não existem agentes — existe este system prompt e mais nada. Se
 * ele sair daqui, o produto vira "só a URL": "nota_registrar" e
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
3. Dúvida entre duas leituras -> não escolha por conta. Mas NÃO despeje as duas
   grafias na pessoa: "li Comata e Cometa, qual é?" mostra a máquina confusa e
   oferece duas opções que podem estar as duas erradas. Pergunte pelo que ela
   sabe de cor — o bairro, a rua, a esquina. Quando o turno te entregar uma
   pergunta pronta, faça EXATAMENTE aquela pergunta.
4. Suposição útil -> rotule como suposição.

Sempre diga o que ficou de fora antes de gravar qualquer coisa. Nada entra na
despensa com um buraco silencioso.

COMO VOCÊ FALA — é conversa de WhatsApp, não formulário.
- O caminho que você PEDE por padrão é a foto da nota fiscal, ou o QR do
  rodapé. É o que dá o dado bom e é o que menos dá trabalho para a pessoa.
- Mas se ela preferir digitar item a item, ou mandar uma planilha, está ótimo:
  aceite e se vire com o que vier. NUNCA devolva uma lista de campos para ela
  preencher ("me manda NOME, CATEGORIA, QUANTIDADE e VALOR"). Isso é
  formulário, e ninguém preenche formulário no zap.
- Quando faltar algo, pergunte UMA coisa por vez, na língua dela.
- NÃO explique como você funciona por dentro. A pessoa não precisa saber que
  houve duas leituras, quantos modelos olharam a foto, o que é chave de acesso
  nem por que a consulta falhou. Diga o que dá para fazer agora, não a mecânica
  do que aconteceu aqui dentro.

NOTA FISCAL — duas fontes, e a ordem entre elas não se negocia.
1. Se veio QR, chame "cupom_ler" PRIMEIRO. O que ela devolver é a Receita
   falando: esses valores VENCEM a foto, sempre, mesmo que a imagem pareça
   dizer outra coisa.
2. Se a "cupom_ler" falhar (a SEFAZ do estado sai do ar com frequência), aí
   sim leia a foto — e diga à pessoa que os valores vieram da imagem e não da
   Receita, porque a diferença importa para ela.
3. Tendo a chave de acesso, passe-a SEMPRE no "nota_registrar", mesmo quando
   os valores vieram da foto. Ela identifica a nota, impede registro em
   duplicidade e permite buscar a versão oficial depois.

PEÇA A FOTO CERTA — é o que mais resolve, e é grátis para a pessoa.
Uma segunda foto de cinco segundos vale mais que dez minutos decifrando.
Peça UMA vez, dizendo exatamente o que faltou, e nunca insista:
- Sem QR na mensagem e a foto mostra os itens -> leia os itens normalmente e,
  no fim, diga que uma foto do RODAPÉ do cupom, com o QR inteiro, traria os
  valores oficiais da Receita em vez da sua leitura. Ofereça, não exija.
- Veio QR mas a consulta oficial falhou, e a foto NÃO mostra a lista de itens
  -> não invente nada: diga que pegou a nota mas não os valores, e peça uma
  foto da parte de cima do cupom, onde ficam os itens.
- Nem QR legível nem itens legíveis -> peça uma foto nova, dizendo o que
  atrapalhou (cortada, tremida, dobrada, reflexo). Não tente adivinhar item
  nenhum a partir de uma foto assim.
- QR cortado pela borda é o caso mais comum: ao pedir de novo, diga para
  enquadrar o rodapé INTEIRO, com o quadrado do QR todo dentro da foto.

FOTO DE CUPOM — lendo os valores da imagem.
- Olhe a foto UMA VEZ, inteira, como ela está. Não peça recorte, não peça
  outra luz, não tente de novo por outro ângulo.
- Ficar decifrando cupom desbotado não é persistência: é o caminho curto para
  inventar item e preço. Uma foto nova custa cinco segundos — peça outra.
- Se a numeração dos itens não começa em 001, ou o total não bate com a soma
  do que você leu, é pedaço de cupom. Diga isso e NÃO registre como se fosse a
  compra inteira.
- Normalizar nome é reescrever o que está escrito ("LEITE INTEG UHT 1L" ->
  "Leite Integral 1L"), nunca completar o que faltou.

Você fala por WhatsApp: respostas curtas, sem markdown pesado, sem tabela.`;

/** O schema que `betaTool` aceita, sem depender de `json-schema-to-ts` direto. */
type SchemaDeObjeto = Parameters<typeof betaTool>[0]["inputSchema"];

/** O que o Worker precisa saber para falar com o Foundry. Vem do env. */
export interface ConfigModelo {
	/** Nome do recurso: https://{resource}.services.ai.azure.com/anthropic/v1 */
	resource: string;
	apiKey: string;
	/** Deployment do Foundry para CONVERSA. Ex.: claude-haiku-4-5. */
	modelo: string;
	/**
	 * Deployment para turnos COM IMAGEM. Modelo maior, e a razão é medida.
	 *
	 * A mesma foto de cupom (22 itens, papel térmico amassado, fotografado de
	 * lado) foi lida pelos três, com este mesmo system prompt:
	 *
	 * - haiku-4-5  : trocou Ovos por "Uvas", Pimenta por "Mineta", Bife por
	 *                "Rife"; perdeu as quantidades de 2 e 4 unidades; devolveu
	 *                só o preço unitário. No item de pimenta isso registraria
	 *                R$ 29,98 no lugar de R$ 1,05 pagos.
	 * - sonnet-5   : acertou itens e valores, mas leu o ANO errado e afirmou
	 *                como fato, e narrou uma chamada de ferramenta que não fez.
	 * - opus-5     : os 22 itens corretos com unitário E total, conferiu que a
	 *                numeração fecha com o total declarado, e rotulou a data
	 *                como suposição a confirmar.
	 *
	 * Ler cupom errado envenena `itens_nota.preco_unitario`, que é o histórico
	 * de preço pago — o único dado do produto que não se copia. Economizar aqui
	 * é economizar no ativo.
	 */
	modeloVisao: string;
	/** Os dois workers que leem a identidade da loja. Modelos DIFERENTES de propósito. */
	modeloWorkerA: string;
	modeloWorkerB: string;
	/** Binding do Browser Run, para abrir a página da NFC-e. */
	navegador: Fetcher;
	/** Narrar o andamento do turno com foto. Var do wrangler: desligar sem deploy. */
	narrador: boolean;
}

export interface EntradaModelo {
	system: string;
	ferramentas: FerramentaLLM[];
	mensagem: MensagemRecebida;
	chamar(nome: string, argumentos: Record<string, unknown>): Promise<string>;
	/** URL da NFC-e lida do QR da foto, quando houve. Decide o caminho do turno. */
	urlNfce: string | null;
	/** Chave de acesso da nota. Vale mesmo se a página da Receita não abrir. */
	chave: string | null;
	/** O que já foi dito nesta conversa, da mais antiga para a mais nova. */
	historico: FalaGravada[];
	/** Manda recado no meio do turno. `null` quando ninguém quer ser avisado. */
	avisar: Avisar | null;
	/** Falas já ditas neste turno, para o narrador não se repetir. */
	jaDitas: string[];
}

/** Manda um recado no meio do turno, antes da resposta final. */
export type Avisar = (texto: string) => Promise<void>;

/** Teto de espera do narrador. Ele é enfeite: não pode atrasar o turno de verdade. */
const NARRADOR_TIMEOUT_MS = 4000;

const NARRADOR_PERSONA =
	"Você é o Listinia falando no WhatsApp com alguém que acabou de mandar a foto de uma " +
	"nota fiscal, e está avisando essa pessoa do que já andou. Escreva APENAS a fala.\n" +
	"\n" +
	"COMO ESCREVER:\n" +
	"- UMA frase curta, no máximo ~20 palavras. Informal, de conversa de zap. No máximo um emoji.\n" +
	"- Fale do que JÁ aconteceu, que é o que está no fato. Nunca prometa prazo ('já já', " +
	"'em instantes', 'em segundos') nem diga o que vem depois.\n" +
	"- PROIBIDO acrescentar qualquer informação que não esteja no fato: nada de número, preço, " +
	"quantidade de itens, nome de loja, data ou marca que o fato não trouxe. Mesmo que você " +
	"ache que sabe, aqui não sai — quem responde é a mensagem final, não você.\n" +
	"- PROIBIDO jargão de máquina: não fale em base64, worker, fila, token, banco de dados, " +
	"modelo, API, decodificar.\n" +
	"- Varie o começo. Não abra com 'Confirmando', 'Estou' nem 'Já estou'.\n" +
	"- Sem aspas em volta, sem traço nem marcador no começo.";

/** Uma linha, sem marcador, dentro do tamanho. Fora disso, não vale. */
function limparNarracao(bruto: string): string | null {
	let t = bruto.trim().replace(/^["'“”]+|["'“”]+$/g, "");
	t = t.split("\n")[0].trim();
	t = t.replace(/^[-*•\d.)\s]+/, "").trim();
	if (t.length < 4 || t.length > 200) return null;
	return t;
}

/** Jaccard de palavras. Backstop determinístico contra o modelo repetir a fala anterior. */
function pareceRepetido(a: string, b: string): boolean {
	const pal = (s: string) => new Set(s.toLowerCase().match(/\p{L}+/gu) ?? []);
	const x = pal(a);
	const y = pal(b);
	if (!x.size || !y.size) return false;
	let comuns = 0;
	for (const p of x) if (y.has(p)) comuns++;
	return comuns / (x.size + y.size - comuns) >= 0.6;
}

/**
 * Diz, em voz de gente, um fato que o CÓDIGO apurou.
 *
 * O fato chega pronto daqui de dentro; o modelo só escolhe as palavras. Narrar
 * progresso inventado, num produto cuja regra número um é `jamais-inventar`,
 * estragaria justamente o que o torna confiável.
 *
 * FAIL-OPEN: erro, demora ou fala repetida devolvem `null`, e quem chamou
 * decide entre um texto fixo e o silêncio. Enfeite nunca derruba turno.
 */
async function narrar(
	cfg: ConfigModelo,
	fato: string,
	jaDitas: readonly string[] = [],
): Promise<string | null> {
	if (!cfg.narrador) return null;
	try {
		const client = new AnthropicFoundry({ resource: cfg.resource, apiKey: cfg.apiKey });
		const r = await client.messages.create(
			{
				model: cfg.modelo,
				max_tokens: 80,
				temperature: 0.8,
				system: NARRADOR_PERSONA,
				messages: [
					{
						role: "user",
						content:
							`FATO: ${fato}` +
							(jaDitas.length
								? `\n\nVOCÊ JÁ DISSE, nesta mesma conversa: ${jaDitas.map((f) => `"${f}"`).join(" ")}\n` +
									"Escreva de um jeito claramente diferente: outro começo, outro verbo."
								: ""),
					},
				],
			},
			{ timeout: NARRADOR_TIMEOUT_MS },
		);
		const bruto = r.content
			.filter((b) => b.type === "text")
			.map((b) => b.text)
			.join("");
		const frase = limparNarracao(bruto);
		if (!frase) return null;
		if (jaDitas.some((f) => pareceRepetido(frase, f))) return null;
		return frase;
	} catch {
		return null;
	}
}

/** Os únicos tipos que a Messages API aceita como imagem. */
const TIPOS_IMAGEM: readonly TipoImagem[] = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
];

/**
 * Bytes -> base64, em blocos.
 *
 * `String.fromCharCode(...bytes)` de uma vez só estoura a pilha numa foto de
 * celular: são centenas de milhares de argumentos numa chamada.
 */
function paraBase64(bytes: Uint8Array): string {
	let binario = "";
	const bloco = 0x8000;
	for (let i = 0; i < bytes.length; i += bloco) {
		binario += String.fromCharCode(...bytes.subarray(i, i + bloco));
	}
	return btoa(binario);
}

/**
 * Baixa a foto UMA vez, para os dois workers da loja e para o turno principal.
 *
 * Devolve `null` em vez de estourar: foto que não baixa vira um pedido educado
 * de reenvio, e não um turno morto com "tive um problema aqui".
 */
async function baixarImagem(url: string): Promise<FonteImagem | null> {
	try {
		const r = await fetch(url);
		if (!r.ok) return null;
		const bytes = new Uint8Array(await r.arrayBuffer());
		const tipo = r.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
		return {
			type: "base64",
			// A Z-API às vezes manda `application/octet-stream`; JPEG é o que o
			// WhatsApp entrega na prática, e é o palpite certo quando não há tipo.
			media_type: TIPOS_IMAGEM.find((t) => t === tipo) ?? "image/jpeg",
			data: paraBase64(bytes),
		};
	} catch {
		return null;
	}
}

/**
 * A única costura com o provider de LLM.
 *
 * Teto de iterações porque o turno roda em `waitUntil` e ninguém está olhando:
 * um modelo que se enrosque chamando ferramenta em círculo queima dinheiro sem
 * nunca responder. 12 dá folga para uma nota fiscal inteira (ler, conferir,
 * gravar item a item) e ainda assim tem fim.
 */
async function chamarModelo(
	entrada: EntradaModelo,
	cfg: ConfigModelo,
	db: D1Database,
): Promise<string> {
	const client = new AnthropicFoundry({ resource: cfg.resource, apiKey: cfg.apiKey });

	// As 10 ferramentas do MCP viram ferramentas do runner sem reescrever
	// nenhuma: o `input_schema` que veio do servidor MCP é aceito como está.
	//
	// O cast existe porque `betaTool` é genérico sobre um schema LITERAL, para
	// inferir o tipo do argumento em tempo de compilação. Os nossos chegam em
	// tempo de execução, vindos do servidor MCP, então não há o que inferir — a
	// validação do argumento continua acontecendo, só que no runner e não no
	// compilador. Quem garante a forma é o MCP, que só emite schema de objeto.
	const ferramentas: ReturnType<typeof betaTool>[] = entrada.ferramentas.map((f) =>
		betaTool({
			name: f.name,
			description: f.description,
			inputSchema: f.input_schema as unknown as SchemaDeObjeto,
			run: (argumentos: unknown) =>
				entrada.chamar(f.name, (argumentos ?? {}) as Record<string, unknown>),
		}),
	);

	// A ferramenta que só existe neste perfil: abrir a página oficial da nota.
	// Ela entra ao lado das 10 do MCP, e o runner não distingue uma da outra.
	if (entrada.urlNfce) {
		const url = entrada.urlNfce;
		ferramentas.push(
			betaTool({
				name: "cupom_ler",
				description:
					"Abre a página oficial da NFC-e desta foto na Receita e devolve o texto dela, " +
					"com estabelecimento, data, itens, quantidades e preços. Use SEMPRE que a " +
					"mensagem trouxer um cupom com QR: é a fonte oficial dos valores.",
				inputSchema: { type: "object", properties: {}, additionalProperties: false },
				run: async () => {
					const r = await lerPaginaNfce(cfg.navegador, url);
					return r.texto ?? `Não deu para ler a nota: ${r.motivo}`;
				},
			}),
		);
	}

	// Quem é a loja: dois workers e um judge (zap/estabelecimento.ts). Roda antes
	// do turno principal porque o resultado muda o que se pode afirmar — e quando
	// o judge não fecha, o certo é PERGUNTAR, não deixar o modelo grande escolher
	// um nome plausível.
	// Cronometragem das três etapas caras. O turno roda em `waitUntil` e a
	// Cloudflare o cancela se demorar — em 12/09/2026 o turno com foto foi
	// cancelado sem dizer ONDE tinha gasto o tempo. Sem isto aqui, a escolha
	// entre cortar etapa e mudar de arquitetura seria palpite.
	const t0 = Date.now();
	const imagem = entrada.mensagem.imagemUrl
		? await baixarImagem(entrada.mensagem.imagemUrl)
		: null;
	const t1 = Date.now();

	const loja = imagem
		? await resolverLoja(client, db, imagem, cfg.modeloWorkerA, cfg.modeloWorkerB)
		: null;
	const t2 = Date.now();
	if (entrada.mensagem.imagemUrl) {
		console.log(
			`tempos: baixar=${t1 - t0}ms loja=${t2 - t1}ms bytes=${imagem ? imagem.data.length : 0}`,
		);
	}

	// Segundo sinal de vida, e o único que tem conteúdo: aqui o código JÁ SABE
	// se o QR abriu e quem é a loja. Nada disto é palpite — se não soubermos,
	// o fato diz que não sabemos, e é isso que a pessoa ouve.
	if (entrada.avisar && imagem) {
		const fatos: string[] = [
			entrada.chave
				? "o QR da nota foi lido e a nota está identificada"
				: "não deu para ler o QR nessa foto, então os valores vão sair da própria imagem",
		];
		if (loja?.status === "acordo" && loja.identidade?.nome) {
			fatos.push(`a loja é ${loja.identidade.nome}`);
		}
		fatos.push("agora estou lendo os itens um por um");
		const frase = await narrar(cfg, fatos.join("; ") + ".", entrada.jaDitas);
		if (frase) {
			entrada.jaDitas.push(frase);
			await entrada.avisar(frase).catch(() => {});
		}
	}

	// A FOTO VAI SEMPRE, mesmo quando o QR foi lido.
	//
	// A versão anterior deste arquivo a omitia quando havia QR, para não tentar
	// o modelo a conferir número na imagem. Estava errado: a SEFAZ de um estado
	// sai do ar (o CE estava fora no dia em que isto foi escrito), e nesse caso
	// o turno ficava sem a fonte oficial E sem a foto — jogando fora a única
	// informação que já estava na mão. A precedência entre as duas fontes é
	// garantida pelo system prompt, não pela ausência da imagem.
	//
	// A chave viaja junto ainda que a página não abra: ela é a identidade da
	// nota, e gravá-la agora é o que permite reprocessar pela Receita depois.
	const conteudo: Array<Record<string, unknown>> = [];
	if (imagem) {
		conteudo.push({ type: "image", source: imagem });
	} else if (entrada.mensagem.imagemUrl) {
		conteudo.push({
			type: "text",
			text: "[A pessoa mandou uma foto, mas eu não consegui baixá-la. Peça para reenviar.]",
		});
	}
	if (entrada.urlNfce) {
		conteudo.push({
			type: "text",
			text:
				"[Esta foto tem um QR de NFC-e. Chame 'cupom_ler' para os valores oficiais." +
				(entrada.chave ? ` Chave de acesso: ${entrada.chave}.` : "") +
				"]",
		});
	}
	if (loja && loja.status !== "nada") {
		const i = loja.identidade;
		conteudo.push({
			type: "text",
			text:
				loja.status === "acordo"
					? `[Loja: CNPJ ${i?.cnpj ?? "não lido"}, ${i?.cidade ?? "?"}/${i?.uf ?? "?"}. ` +
						(i?.nome
							? `Nome: ${i.nome}.`
							: `O NOME não está confirmado. Faça exatamente esta pergunta, sem explicar por quê: ` +
								`"${loja.pergunta ?? ""}" Não escolha um nome por conta.`) +
						(loja.estabelecimentoId ? " Já está cadastrado." : "")
					: `[A loja não está confirmada. Faça exatamente esta pergunta, sem explicar por quê: ` +
						`"${loja.pergunta}"]`,
		});
	}
	conteudo.push({ type: "text", text: entrada.mensagem.texto || "(mensagem sem texto)" });

	// Foto no turno -> modelo de visão, e mais espaço: uma nota de 22 itens vira
	// uma chamada de ferramenta longa, e truncar no meio perde itens em silêncio.
	const temImagem = Boolean(imagem);

	const resposta = await client.beta.messages.toolRunner({
		model: temImagem ? cfg.modeloVisao : cfg.modelo,
		max_tokens: temImagem ? 16000 : 4096,
		system: entrada.system,
		tools: ferramentas,
		// O HISTÓRICO VEM ANTES, e é o que faz a pergunta fechada da loja
		// funcionar: sem ele, a pessoa responde "Supermercado Cometa" e o turno
		// não sabe que alguém perguntou o nome de um mercado.
		messages: [
			...entrada.historico.map((f) => ({ role: f.papel, content: f.texto })),
			{ role: "user", content: conteudo },
		] as never,
		max_iterations: 12,
	});
	console.log(`tempos: turno=${Date.now() - t2}ms modelo=${temImagem ? cfg.modeloVisao : cfg.modelo}`);

	const texto = resposta.content
		.filter((b) => b.type === "text")
		.map((b) => b.text)
		.join("\n")
		.trim();

	// Sem texto = o turno acabou no teto de iterações, no meio de uma sequência
	// de ferramentas. Dizer isso é melhor que devolver silêncio, e `jamais-inventar`
	// proíbe fabricar um resumo do que não terminou.
	return texto || "Comecei a mexer nisso mas não consegui fechar a resposta. Me manda de novo?";
}

/**
 * Mensagem entra, texto de resposta sai. Quem manda pelo canal é o entrypoint.
 *
 * A ORDEM DOS PORTÕES É DE PROPÓSITO, e cada um existe por um incidente ou por
 * um risco concreto:
 *
 * 1. grupo  — em 12/09/2026 dois grupos viraram "usuário" porque a Z-API põe o
 *             ID do grupo no campo do telefone. Recusa até existir despensa
 *             compartilhada de verdade.
 * 2. aceite — no mesmo dia sete contatos foram cadastrados sem pedir nada, só
 *             por mandarem mensagem. Telefone de terceiro é dado pessoal.
 * 3. teto   — o número é público; sem limite, um contato hostil vira fatura.
 *
 * Os três recusam ANTES de abrir ferramenta ou chamar modelo. Isso não é só
 * economia: significa que um estranho não consegue nos custar um centavo, e
 * que o caso mais comum de abuso é o mais barato de atender.
 */
export async function processarMensagem(
	db: D1Database,
	mensagem: MensagemRecebida,
	cfg: ConfigModelo,
	limiteTurnosDia: number,
	avisar: Avisar | null = null,
): Promise<string> {
	if (mensagem.deGrupo) return TEXTO_GRUPO;

	let userId = await buscarUsuarioPorTelefone(db, mensagem.telefone);
	if (!userId) {
		if (!ehAceite(mensagem.texto)) return TEXTO_CONVITE;
		userId = await criarUsuario(db, mensagem.telefone);
		return TEXTO_BOAS_VINDAS;
	}

	const turnos = await registrarTurno(db, userId, new Date().toISOString().slice(0, 10));
	if (turnos > limiteTurnosDia) return TEXTO_TETO;

	// Sinal de vida ANTES do trabalho longo. Turno com nota fiscal passa minutos
	// na fila, e silêncio total parece pane — foi assim que o produto pareceu
	// morto no primeiro teste real. Vem depois dos portões de propósito:
	// estranho não recebe aviso nenhum.
	const jaDitas: string[] = [];
	if (mensagem.imagemUrl && avisar) {
		const frase =
			(await narrar(cfg, "recebi a foto da nota e comecei a olhar.")) ??
			"Recebi sua nota 📸 já tô olhando.";
		jaDitas.push(frase);
		await avisar(frase).catch(() => {});
	}

	// QR ANTES DO MODELO. Não custa token e decide o caminho do turno: com QR os
	// valores virão da Receita; sem QR, o modelo olha a foto uma vez e o prompt
	// já diz o que ele pode e não pode concluir dela.
	const leitura = mensagem.imagemUrl ? await lerQrDoCupom(mensagem.imagemUrl) : null;

	const historico = await carregarConversa(db, userId);

	const ferramentas = await abrirFerramentas(db, userId);
	try {
		const resposta = await chamarModelo(
			{
				system: SYSTEM_PROMPT,
				ferramentas: ferramentas.defs,
				mensagem,
				chamar: ferramentas.chamar,
				urlNfce: leitura?.urlNfce ?? null,
				chave: leitura?.chave ?? null,
				historico,
				avisar,
				jaDitas,
			},
			cfg,
			db,
		);
		// A foto vira MARCADOR no histórico, nunca base64. O modelo não precisa
		// rever a imagem para lembrar do que leu — a leitura dele fica na
		// resposta que estamos gravando aqui do lado.
		const doUsuario = mensagem.imagemUrl
			? `[foto de nota fiscal] ${mensagem.texto}`.trim()
			: mensagem.texto;
		await gravarTurno(db, userId, doUsuario || "(mensagem sem texto)", resposta);
		return resposta;
	} finally {
		await ferramentas.fechar();
	}
}
