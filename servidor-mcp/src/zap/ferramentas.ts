/**
 * As 10 ferramentas do perfil de compras, prontas para um harness de LLM.
 *
 * O ponto todo deste arquivo: NÃO reescrever nenhuma ferramenta. As que já
 * estão em produção são registradas num `McpServer` (tools-despensa.ts,
 * tools-encartes.ts) e é esse mesmo servidor que sobe aqui — só que EM MEMÓRIA,
 * dentro do próprio Worker, ligado por um par de transportes. Sem rede, sem
 * OAuth, sem MCP connector: o harness fala com as ferramentas por chamada de
 * função, e o nome/schema/descrição de cada uma continua vindo da fonte única.
 *
 * O que este arquivo faz de novo é só a conversão do formato de ferramenta do
 * MCP para o formato que a Messages API espera — ~30 linhas, escritas uma vez,
 * válidas para as 10 e para qualquer ferramenta futura.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/server";
import { registrarToolsDespensa } from "../tools-despensa";
import { registrarToolsOfertas } from "../tools-encartes";

/** Uma ferramenta no formato da Messages API (`tools[]`). */
export interface FerramentaLLM {
	name: string;
	description: string;
	input_schema: Record<string, unknown>;
}

export interface Ferramentas {
	/** As definições, prontas para ir no campo `tools` da requisição. */
	defs: FerramentaLLM[];
	/** Executa uma ferramenta pelo nome e devolve o texto do resultado. */
	chamar(nome: string, argumentos: Record<string, unknown>): Promise<string>;
	fechar(): Promise<void>;
}

/**
 * Sobe o servidor MCP de compras em memória e devolve as ferramentas dele.
 *
 * O `userId` é fechado aqui dentro, no registro — exatamente como o Worker de
 * compras faz com o `props.userId` do OAuth. Nenhuma ferramenta recebe o
 * usuário como argumento, então o modelo não tem como pedir a despensa de
 * outra pessoa nem por engano nem de propósito.
 */
export async function abrirFerramentas(db: D1Database, userId: string): Promise<Ferramentas> {
	const server = new McpServer({ name: "listinia-zap", version: "0.1.0" });
	registrarToolsDespensa(server, db, userId);
	registrarToolsOfertas(server, db, userId);

	const [doCliente, doServidor] = InMemoryTransport.createLinkedPair();
	const client = new Client({ name: "harness-zap", version: "0.1.0" });
	await Promise.all([server.connect(doServidor), client.connect(doCliente)]);

	const { tools } = await client.listTools();
	const defs: FerramentaLLM[] = tools.map((t) => ({
		name: t.name,
		description: t.description ?? "",
		input_schema: t.inputSchema as Record<string, unknown>,
	}));

	return {
		defs,

		async chamar(nome, argumentos) {
			const r = await client.callTool({ name: nome, arguments: argumentos });
			const blocos = (r.content ?? []) as Array<{ type: string; text?: string }>;
			const texto = blocos
				.filter((b) => b.type === "text")
				.map((b) => b.text ?? "")
				.join("\n");
			// O erro da ferramenta volta como texto, não como exceção: o modelo
			// precisa LER a falha para poder pedir o que faltou à pessoa. Estourar
			// aqui mataria o turno e a pessoa receberia silêncio.
			return texto || "(ferramenta não devolveu texto)";
		},

		async fechar() {
			await client.close();
			await server.close();
		},
	};
}
