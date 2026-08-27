/**
 * Worker de Compras — https://compras-mcp.listinia.com.br/mcp
 *
 * Serve o plugin listinia-compras: a despensa do consumidor e a consulta de
 * ofertas. Nao expoe nenhuma ferramenta de lojista nem a rota do ERP.
 */

import { criarWorker } from "./entrypoint";
import { registrarToolsDespensa } from "./tools-despensa";
import { registrarToolsOfertas } from "./tools-encartes";

export default criarWorker({
	nome: "listinia-compras",
	versao: "1.0.0",
	resourcePadrao: "https://compras-mcp.listinia.com.br/mcp",
	resourceName: "Listinia — despensa e compras",
	escopos: ["despensa.read", "despensa.write"],
	rotaErp: false,
	registrar: (server, db, userId) => {
		registrarToolsDespensa(server, db, userId);
		registrarToolsOfertas(server, db, userId);
	},
});
