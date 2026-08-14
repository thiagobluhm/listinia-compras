# listinia-compras

Listinia de compras, aqui temos um aplicativo capaz de ajudar todos na hora de criar uma lista de compras, porem com algo a mais.

Este repositório contém o **plugin de Cowork "listinia-compras"**: captura
notas fiscais (por QR code ou foto), mantém uma planilha de despensa e um
dashboard sempre atualizados, gera listas de compras baseadas no seu
consumo real, e pesquisa preços em encartes de supermercado.

O plugin é um companheiro **standalone** — guarda tudo localmente na sessão
do Cowork, em arquivos que você pode abrir e levar com você (XLSX, JSON,
dashboard HTML), sem depender de nenhum backend estar no ar.

## O que ele faz

| Skill | O que faz |
|---|---|
| `captura-nota-fiscal` | Lê o QR code da nota (Playwright abre a página da SEFAZ) ou, se não der, lê a foto direto. Extrai os itens da compra. |
| `despensa-xlsx` | Mantém `despensa.xlsx` — log de compras e estoque atual por item, com categoria e dias restantes de estoque. |
| `dashboard-despensa` | Dashboard HTML persistente (artefato do Cowork) com gasto por categoria, top produtos, mercados mais usados e itens acabando. |
| `gerador-lista-compras` | Gera a lista de compras da próxima ida ao mercado, baseada no consumo real e na sua frequência de compra. |
| `pesquisa-encartes-mercado` | Cadastra seus 3–5 mercados preferidos e pesquisa preços atuais nos sites deles via Playwright, cruzando com sua lista de compras. |
| `alerta-estoque-baixo` | Verifica o que está acabando e, se você quiser, agenda uma checagem recorrente com notificação. |

## Como usar

1. Fotografe ou anexe uma nota fiscal e diga algo como "captura essa nota".
2. Depois de algumas compras, peça "monta minha lista de compras" ou "como
   tá minha despensa".
3. Na primeira vez que pedir preços, o Cowork vai perguntar quais mercados
   você usa (nome, endereço, site, página de ofertas).
4. Peça o dashboard quando quiser ver o panorama geral de gastos.

## Estrutura do plugin

```
listinia-compras/
├── .claude-plugin/
│   └── plugin.json
├── .mcp.json                        # MCP server oficial do Playwright
├── skills/
│   ├── captura-nota-fiscal/
│   ├── despensa-xlsx/
│   │   └── references/categorias.md
│   ├── dashboard-despensa/
│   ├── gerador-lista-compras/
│   ├── pesquisa-encartes-mercado/
│   └── alerta-estoque-baixo/
└── README.md
```

## Arquivos que o plugin gera na pasta de trabalho da sessão

- `despensa.xlsx` — planilha com abas "Compras" e "Despensa"
- `mercados.json` — mercados preferidos cadastrados
- `config-habitos.json` — frequência de compra do usuário
- dashboard `dashboard-despensa` — artefato HTML persistente no Cowork

## Dependência técnica

Este plugin usa o servidor MCP oficial do Playwright (`@playwright/mcp`,
via `npx`) para abrir páginas da SEFAZ e sites de supermercado. Requer
Node.js disponível no ambiente onde o Cowork roda.

## Origem das regras de negócio

As categorias de produto, as durações padrão de estoque por categoria
(ex.: hortifrúti 5 dias, laticínios 10, limpeza 45) e a fórmula de dias
restantes foram portadas do backend real do app Listinia do autor, para
manter consistência com um sistema já validado em produção, em vez de
valores inventados.

## Roadmap

A pesquisa de encartes hoje é feita ao vivo, via scraping. A ideia é que,
futuramente, isso evolua para um MCP dedicado conectando diretamente ao
marketplace de ofertas do backend Listinia (onde supermercados cadastrados
competem por oferta). Esse MCP ainda não existe e não faz parte deste
plugin.

## Licença

MIT — veja [LICENSE](./LICENSE).
