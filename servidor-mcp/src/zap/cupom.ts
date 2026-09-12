/**
 * O caminho AUTORITATIVO do cupom fiscal: QR code -> URL da NFC-e.
 *
 * Por que isto existe, e por que ele vem ANTES do modelo: o número da nota não
 * deve ser lido de uma foto. O cupom tem um QR que aponta para a página oficial
 * da NFC-e na Receita, e é de lá que vêm item, quantidade e preço — exatos, sem
 * leitura duvidosa. Ler preço de imagem é o caminho mais curto para gravar um
 * valor que não existe, e `jamais-inventar` proíbe exatamente isso.
 *
 * É a Missão 1 do agente `listinia-leitor-visual` (agents/listinia-leitor-visual.md),
 * trazida para dentro do Worker. Lá ela roda um script Python com zxing-cpp /
 * pyzbar / opencv; aqui não há Python, então é JS puro: `jpeg-js` transforma o
 * JPEG em pixels (o Worker não tem `canvas`) e o `jsQR` procura o código.
 *
 * Só a leitura mora aqui. Quem abre a página é outro arquivo — a mesma
 * separação que os plugins fazem entre o leitor visual e o navegador.
 */

import jpeg from "jpeg-js";
import jsQR from "jsqr";

/** Teto de pixels na decodificação. Foto de celular moderna passa fácil de 12 MP,
 *  e estourar a CPU do Worker no meio do turno é pior que recusar com clareza. */
const MAX_PIXELS = 40_000_000;

export interface LeituraCupom {
	/** URL da NFC-e, quando o QR trouxe uma. */
	urlNfce: string | null;
	/** O que o QR continha, quando não era uma URL utilizável. */
	conteudoBruto: string | null;
	/** Por que não deu, em linguagem de quem vai ler no WhatsApp. */
	motivo: string | null;
}

/**
 * A URL é mesmo de uma NFC-e?
 *
 * Deliberadamente frouxo quanto ao domínio — cada UF publica num host próprio
 * (`nfce.fazenda.xx.gov.br`, `sefaz.xx.gov.br`, e variações) e uma lista fixa
 * ficaria desatualizada no dia em que um estado mudasse. O que se exige é o que
 * de fato caracteriza a nota: ser http(s) de um domínio de governo brasileiro
 * e carregar o parâmetro `p` (ou `chNFe`), que é onde vive a chave de acesso.
 *
 * NUNCA montamos a URL a partir da chave. Isso é proibido na spec do leitor
 * visual, e com razão: URL montada à mão é palpite com cara de endereço.
 */
function pareceNfce(texto: string): boolean {
	let u: URL;
	try {
		u = new URL(texto);
	} catch {
		return false;
	}
	if (u.protocol !== "https:" && u.protocol !== "http:") return false;
	if (!/\.gov\.br$/i.test(u.hostname)) return false;
	return u.searchParams.has("p") || u.searchParams.has("chNFe");
}

/**
 * Baixa a imagem e procura o QR. Não chama modelo, não gasta token.
 *
 * Devolve `urlNfce: null` com um `motivo` quando não achar — e aí quem decide
 * cair para a leitura da foto pelo modelo é o harness, nunca este arquivo.
 * Essa decisão é do orquestrador na spec, e a razão é boa: cair sozinho para o
 * caminho pior esconde do resto do sistema que o caminho bom falhou.
 */
export async function lerQrDoCupom(imagemUrl: string): Promise<LeituraCupom> {
	const vazio = (motivo: string): LeituraCupom => ({ urlNfce: null, conteudoBruto: null, motivo });

	let bytes: Uint8Array;
	try {
		const r = await fetch(imagemUrl);
		if (!r.ok) return vazio(`não consegui baixar a imagem (HTTP ${r.status})`);
		bytes = new Uint8Array(await r.arrayBuffer());
	} catch (e) {
		// Só o nome do tipo: a URL da imagem é assinada e a mensagem de erro a
		// carregaria inteira para o log.
		return vazio(`não consegui baixar a imagem (${(e as Error).name})`);
	}
	return decodificarQr(bytes);
}

/**
 * O miolo, sem rede: bytes de imagem entram, leitura sai.
 *
 * Separado de `lerQrDoCupom` para poder ser exercitado com um arquivo local,
 * sem URL pública e sem depender da Z-API estar de pé.
 */
export function decodificarQr(bytes: Uint8Array): LeituraCupom {
	const vazio = (motivo: string): LeituraCupom => ({ urlNfce: null, conteudoBruto: null, motivo });

	let pixels: { data: Uint8Array; width: number; height: number };
	try {
		pixels = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 256 });
	} catch {
		return vazio("não consegui abrir a imagem — ela veio em um formato que não sei ler");
	}
	if (pixels.width * pixels.height > MAX_PIXELS) {
		return vazio("a foto é grande demais para eu processar — manda uma um pouco menor?");
	}

	const achado = jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height);
	if (!achado) return vazio("não encontrei um QR code legível");

	if (!pareceNfce(achado.data)) {
		return { urlNfce: null, conteudoBruto: achado.data, motivo: "o QR não é de uma nota fiscal" };
	}
	return { urlNfce: achado.data, conteudoBruto: achado.data, motivo: null };
}
