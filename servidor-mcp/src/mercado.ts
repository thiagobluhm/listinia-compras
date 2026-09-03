/**
 * Worker de Mercado — https://mercado-mcp.listinia.com.br/mcp
 *
 * Serve o plugin listinia-mercado: cadastro do estabelecimento, publicacao de
 * encarte e desempenho. Nao enxerga a despensa de nenhum consumidor.
 */

import { criarWorker } from "./entrypoint";
import { registrarToolsMercado } from "./tools-encartes";

export default criarWorker({
	nome: "listinia-mercado",
	versao: "1.0.0",
	resourcePadrao: "https://mercado-mcp.listinia.com.br/mcp",
	resourceName: "Listinia — encartes do lojista",
	identidade: {
		nome: "Listinia — encartes do seu mercado",
		descricao:
			"Conectando, o Listinia passa a publicar e conferir os encartes do seu estabelecimento. Ele não tem acesso à despensa de nenhum consumidor.",
	},
	escopos: ["encarte.read", "encarte.write"],
	rotaErp: true,
	registrar: registrarToolsMercado,
});
