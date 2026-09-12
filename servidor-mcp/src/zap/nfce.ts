/**
 * A página oficial da NFC-e -> texto.
 *
 * Segundo passo do caminho autoritativo. O QR deu a URL (zap/cupom.ts); aqui a
 * página é aberta de verdade e o texto renderizado é extraído.
 *
 * Por que navegador e não `fetch`: as consultas de NFC-e das SEFAZ montam a
 * tabela de itens por JavaScript. Um `fetch` traz o HTML vazio e a nota
 * parece não ter item nenhum — falha silenciosa, que é a pior espécie. Nos
 * plugins esse papel é do agente `listinia-navegador`, que dirige o Playwright;
 * dentro do Worker o equivalente é o Browser Run da própria Cloudflare.
 *
 * O que sai daqui é TEXTO, não pixel. Quem transforma o texto em itens é o
 * modelo, e essa diferença é a razão de tudo isto existir: ele lê números
 * escritos pela Receita, não dígitos adivinhados de uma foto amassada.
 */

import puppeteer from "@cloudflare/puppeteer";

/** Teto de texto devolvido ao modelo. Nota de compra grande passa de 200 itens,
 *  mas página inteira com rodapé e menu só gasta contexto. */
const MAX_CARACTERES = 24_000;

export interface PaginaNfce {
	texto: string | null;
	motivo: string | null;
}

/**
 * Abre a URL da NFC-e e devolve o texto visível da página.
 *
 * Nunca monta URL: recebe a que veio do QR e só. URL montada a partir da chave
 * de acesso é palpite com cara de endereço, e a spec do leitor visual proíbe
 * explicitamente — com razão.
 */
export async function lerPaginaNfce(navegador: Fetcher, url: string): Promise<PaginaNfce> {
	let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
	try {
		browser = await puppeteer.launch(navegador);
		const pagina = await browser.newPage();
		// `networkidle0` porque a tabela de itens chega depois do load; esperar só
		// o `load` devolve a pagina sem os itens.
		await pagina.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });
		// Este callback roda DENTRO da página, não no Worker — por isso `document`
		// não existe para o compilador daqui e precisa ser alcançado assim.
		const texto = await pagina.evaluate(
			() =>
				(globalThis as unknown as { document: { body: { innerText: string } } }).document.body
					.innerText,
		);
		const limpo = (texto ?? "").replace(/\n{3,}/g, "\n\n").trim();
		if (!limpo) return { texto: null, motivo: "a página da nota abriu vazia" };
		return { texto: limpo.slice(0, MAX_CARACTERES), motivo: null };
	} catch (e) {
		// Só o nome do tipo: a URL carrega a chave de acesso da nota.
		return { texto: null, motivo: `não consegui abrir a página da nota (${(e as Error).name})` };
	} finally {
		await browser?.close().catch(() => {});
	}
}
