# Listinia — servidor MCP da despensa

Servidor MCP remoto que guarda a despensa em **SQLite** (Cloudflare D1) e expõe
READ, CREATE, UPDATE e DELETE como ferramentas.

Substitui o arquivo `despensa.jsonl` no Google Drive. A diferença que importa:
registrar uma nota passou a ser **uma chamada com os itens**, em vez de reescrever
o arquivo inteiro. O tempo de gravação para de crescer conforme a despensa cresce.

---

## Ferramentas expostas

| Ferramenta | O que faz |
|---|---|
| `despensa_listar` | Estado atual, um registro por produto. Filtra por categoria ou nome. |
| `despensa_status` | Dias restantes e status (`crítico` / `baixo` / `ok`) de cada item. |
| `notas_listar` | Histórico de compras. |
| `nota_itens` | Itens de uma nota específica. |
| `nota_registrar` | **A principal.** Grava a nota, os itens e soma tudo na despensa, numa chamada só. |
| `produto_salvar` | Cria ou ajusta um produto à mão (`definir` ou `somar`). |
| `produto_remover` | Tira um produto do estado atual. |
| `nota_remover` | Apaga uma nota do histórico. |

`nota_registrar` aceita a **chave de acesso da NFC-e**. Se a mesma chave chegar
duas vezes, a nota não é gravada de novo — protege contra registro duplicado.

Categoria vem em branco? É classificada automaticamente pela tabela de
`src/categorias.ts`, portada do `categorizer.py` do app.

---

## Deploy (uma vez, ~10 minutos)

Pré-requisito: Node 18+ e uma conta Cloudflare.

```bash
npm install
npx wrangler login
```

**1. Criar o banco**

```bash
npx wrangler d1 create listinia
```

O comando devolve um `database_id`. Cole ele em `wrangler.jsonc`, no lugar de
`PREENCHER_APOS_CRIAR_O_BANCO`.

**2. Criar as tabelas**

```bash
npm run db:schema
```

**3. Definir o segredo de acesso**

```bash
npx wrangler secret put LISTINIA_TOKEN
```

Cole uma string longa e aleatória (ex.: saída de `openssl rand -hex 24`).
Guarde — ela faz parte da URL.

**4. Publicar**

```bash
npm run deploy
```

**5. Conectar no Claude**

A URL do conector é:

```
https://listinia-despensa.<seu-subdominio>.workers.dev/<LISTINIA_TOKEN>/mcp
```

No app do Claude: **Configurações → Conectores → Adicionar conector
personalizado** e cole a URL. Servidor colocado direto no arquivo de config
**não** conecta — tem que ser por aí.

---

## Sobre a autenticação

Esta versão usa **segredo no caminho da URL**. Quem tiver a URL inteira acessa a
despensa; quem não tiver recebe 404. Para uma despensa doméstica com URL não
divulgada, resolve — mas é obscuridade, não autenticação de verdade.

Se `LISTINIA_TOKEN` não for definido, o servidor fica **aberto**. Não faça isso.

O caminho definitivo é OAuth com Dynamic Client Registration (o Claude não
aceita client ID/secret colado à mão). A Cloudflare tem exemplo pronto disso —
fica como próximo passo, não como impedimento para usar hoje.

---

## Rodar local

```bash
npm run db:local     # cria as tabelas no SQLite local
npm run dev          # sobe em http://localhost:8787
```

Sem `LISTINIA_TOKEN` definido no ambiente local, o endereço é
`http://localhost:8787/mcp`.

---

## Custo

Dentro do plano gratuito da Cloudflare, com folga enorme para este uso:

- 5 milhões de linhas lidas por dia
- 100 mil linhas escritas por dia
- 5 GB de armazenamento

Uma nota de 43 itens gasta 86 escritas. Workers não cobra por serviço ocioso.

---

## Estado de validação

Testado ponta a ponta com `wrangler dev` local e a nota real do Supermercados
Cometa (24/08/2026, 43 itens, R$ 509,25):

- os 43 itens gravados; soma dos itens = total da nota
- 38 produtos distintos (os 5 itens repetidos foram somados corretamente)
- categorização conferida por amostragem
- ajuste manual preservando a unidade original
- remoção de produto
- rejeição de nota duplicada pela chave

## Migração do Google Drive

O `despensa.jsonl` que existe hoje no Drive **ainda não foi migrado**. Ele usa
chaves curtas (`i`, `c`, `q`, `u`, `cm`, `uc`, `p`) que mapeiam direto para as
colunas de `produtos`. A migração é uma leitura do arquivo e uma sequência de
`produto_salvar` — feita uma vez, depois do deploy.
