# Listinia — regras do projeto

Duas regras abaixo são **absolutas**. Não são preferência de estilo: quebrar
qualquer uma delas é defeito, não escolha de implementação. Se uma tarefa
parecer pedir a quebra de uma delas, **pare e pergunte** — o pedido está
errado, não o código.

---

## 1. JAMAIS usar o nome do autor pessoa física

A face pública do Listinia é **AIstein LTDA**. O nome civil do autor não entra
em **canto nenhum**.

Vale para todo campo que um terceiro possa ler:

- autoria em `plugin.json`, `package.json`, README, documentação;
- `LICENSE` e aviso de copyright;
- domínio, subdomínio, nome de recurso, nome de bucket, nome de projeto;
- variável de ambiente, e-mail em arquivo versionado, comentário de código;
- mensagem de erro, resposta de API, texto que chegue ao usuário final.

Em dúvida se um campo é público, **trate como público**.

**Armadilha conhecida:** o subdomínio `*.workers.dev` da Cloudflare vem do nome
da conta e aparece em todo Worker sem domínio próprio. Ninguém o escreveu no
repositório, e ele não sai editando arquivo: some com `custom_domain` na zona
`listinia.com.br` mais `"workers_dev": false`. É assim que `listinia-compras`
(`compras-mcp.listinia.com.br`) e `listinia-mercado`
(`mercado-mcp.listinia.com.br`) já operam — todo Worker novo deve nascer igual.

E-mail: use endereço de domínio da empresa, nunca um pessoal.

---

## 2. MERCADO e COMPRAS são SEPARADOS

São dois públicos com interesses opostos:

- **`compras`** — o **consumidor**: despensa, notas fiscais, o que ele pagou.
- **`mercado`** — o **lojista**, que é **cliente pagante**: encartes e ofertas.

Ferramenta de um **nunca** pode aparecer no outro. Despensa exposta ao lojista
entrega dado de consumidor a quem vende para ele.

A separação é **estrutural**, e é assim que deve continuar:

| Entrypoint | Importa |
|---|---|
| `src/mercado.ts` | **somente** `tools-encartes` |
| `src/compras.ts` | `tools-despensa` + `tools-encartes` |
| `src/zap.ts` | nenhum dos dois — usa `zap/ferramentas.ts` |

**`mercado.ts` NUNCA importa `tools-despensa`.** Ao criar ferramenta nova,
decida o perfil **antes** do arquivo, e confira quem importa esse arquivo antes
de escrever a primeira linha.

São três Workers, três `wrangler.*.jsonc`, três entrypoints. O único
compartilhamento deliberado é o banco **D1 `listinia`**.

### Consequência a vigiar

O `zap` não tem ferramentas próprias: `zap/ferramentas.ts` sobe o servidor MCP
de **compras** em memória, para não reescrever ferramenta nenhuma. Então tudo
que nasce para o zap aparece em `compras` no próximo deploy dele. Isso **não**
viola a regra 2 (não envolve mercado), mas é preciso ser deliberado a respeito.
