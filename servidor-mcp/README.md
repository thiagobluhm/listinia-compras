# Listinia — os dois Workers MCP

Este diretório é o **servidor**. O que cada plugin faz, para quem serve e como
se instala está no [`PLUGINS.md`](../PLUGINS.md) da raiz — é a fonte de verdade
do produto, e não se repete aqui.

Aqui fica só o que o `PLUGINS.md` não cobre: como isto sobe e como se mexe.

## A forma

Dois Workers da Cloudflare, hosts separados, **mesmo D1 e mesmo KV de OAuth**:

| Worker | Host | Entrypoint | Ferramentas |
|---|---|---|---|
| `listinia-compras` | `compras-mcp.listinia.com.br` | `src/compras.ts` | 10 — despensa, notas, ofertas |
| `listinia-mercado` | `mercado-mcp.listinia.com.br` | `src/mercado.ts` | 8 — encarte, cadastro, desempenho |

O que muda entre os dois é só o conjunto de ferramentas, os escopos e o
resource metadata — nada de schema, nada de migration. A fábrica comum está em
`src/entrypoint.ts`; cada entrypoint é uma chamada a `criarWorker()`.

Só o de mercado expõe **`POST /v1/encarte`**, a porta do ERP do lojista,
autenticada pela chave do estabelecimento (`Authorization: Bearer`).

## Autenticação

**Google OAuth** com Dynamic Client Registration, feito pelo
`@cloudflare/workers-oauth-provider`. A tela de consentimento e o vai-e-volta
com o Google estão em `src/google-handler.ts`.

A identidade é o `sub` do Google, resolvido em `resolverUsuario()` para um id
interno estável (`u_...`) com `UNIQUE (provedor, provedor_sub)`. Esse id vira
`props.userId` no token e escopa **toda** query do banco. Consequência: o
cliente MCP não é dono de nada — a mesma conta Google no Claude e no Codex é a
mesma despensa. Requisição sem `props.userId` recebe 401 em vez de ser servida.

`EMAIL_DONO_LEGADO` é a exceção histórica: no primeiro login, essa conta é
vinculada ao `u_legado` para não encontrar a casa vazia. Vale uma vez.

E-mail do Google não verificado é recusado com 403 — e-mail não verificado não
serve de identidade quando é ele que liga alguém aos dados antigos.

## Subir

```bash
npm install
npx wrangler login

npm run db:schema        # cria as tabelas no D1 remoto (uma vez)
npm run deploy           # os dois Workers
```

`deploy:compras` e `deploy:mercado` sobem um de cada vez. **Não há CI:** o
deploy é sempre manual, e merge na `main` não publica nada.

Segredos (uma vez por conta, `npx wrangler secret put <nome>` com o `-c` do
Worker): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `COOKIE_ENCRYPTION_KEY`.

`MCP_RESOURCE` fica em `vars` no `wrangler.*.jsonc` e precisa bater
**exatamente** com a URL que o cliente usa, `/mcp` incluído. Divergiu, a
descoberta do OAuth falha.

## Mexer

```bash
npm run dev:compras      # localhost:8787
npm run dev:mercado      # localhost:8788
npm run db:local         # tabelas no SQLite local
npm run type-check       # tsc --noEmit
npm run cf-typegen       # regera worker-configuration.d.ts
```

`worker-configuration.d.ts` é **gerado**. Mudou `wrangler.compras.jsonc`, rode
`cf-typegen` em vez de editar o arquivo à mão.

`_legado/` guarda a geração anterior — um Worker só, autenticado por segredo no
caminho da URL. Está ali como histórico; nada em `src/` depende dele.

## Custo

Dentro do plano gratuito da Cloudflare, com folga grande para este uso: 5
milhões de linhas lidas por dia, 100 mil escritas, 5 GB. Uma nota de 43 itens
gasta 86 escritas, e Workers não cobra por serviço ocioso.
