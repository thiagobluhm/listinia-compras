---
name: pesquisa-encartes-mercado
description: Registers the user's preferred supermarkets (name, address, website, flyer/offers page) on first use, and researches current promotions on those sites via Playwright to estimate prices for a shopping list. Use when the user wants to add or update a preferred market, check current supermarket offers/encartes, or wants their shopping list with an estimated price and the cheapest option per item.
---

# Pesquisa de Encartes de Supermercado

**Isto é funcionalidade nova** — não existe hoje no app Listinia real (lá,
o encarte é o próprio supermercado que sobe via upload). Aqui o objetivo é
o usuário final pesquisar preços diretamente nos sites dos mercados que ele
escolher, via navegador automatizado.

## Cadastro de mercados (primeira vez ou quando pedido)

Arquivo: `mercados.json` — mesmo lugar persistente do `despensa.xlsx` (veja
a seção de persistência na skill `despensa-xlsx`). Carregue o real antes
de assumir que não existe nenhum mercado cadastrado.

```json
{
  "mercados": [
    {"nome": "", "endereco": "", "site": "", "pagina_encartes": ""}
  ]
}
```

- Se o arquivo não existir e o usuário pedir uma pesquisa de preços,
  pergunte por 3 a 5 mercados preferidos: nome, endereço, site e — se ele
  souber — a página específica de encartes/ofertas. Se ele não souber a
  página de encartes, tente localizá-la você mesmo (navegue até o site e
  procure links como "Ofertas", "Encartes", "Promoções").
- Se o arquivo já existir e o usuário disser algo como "adiciona esse
  mercado" ou "troca o mercado X pelo Y", edite a lista existente — não
  peça os outros mercados de novo, só o que mudou.

## Pesquisa de ofertas

1. Para cada mercado cadastrado, use as ferramentas MCP do Playwright para
   navegar até a `pagina_encartes` (ou o site, se não houver página
   específica).
2. Extraia produtos e preços visíveis na página (nome, preço, unidade
   quando disponível).
3. Alguns sites bloqueiam scraping ou usam paginação/carrossel — se não
   conseguir extrair nada de um mercado, registre isso explicitamente em
   vez de inventar preços para ele.

## Cruzamento com a lista de compras

Para cada item da lista (vinda da skill `gerador-lista-compras` ou
informada diretamente pelo usuário):

1. Procure correspondência (por nome/categoria, aproximada) nas ofertas
   extraídas de cada mercado.
2. Se houver preço em mais de um mercado, aponte o mais barato.
3. Se não houver preço em nenhum mercado, marque o item como **"sem
   cotação"** — nunca estime um preço que não veio de uma fonte real.
4. Calcule o valor total estimado: some os preços encontrados; para itens
   sem cotação, deixe claro que não entraram na soma.

## Resultado final

Entregue a lista com: item, quantidade, mercado mais barato encontrado
(ou "sem cotação"), preço unitário, e o valor total estimado da compra —
isto é a "lista pronta com o provável valor" que o usuário pediu.

## Roadmap (não implementar agora)

O usuário mencionou que, no futuro, isso vai evoluir para um MCP dedicado
que conecta diretamente com os supermercados parceiros da plataforma
Listinia (via o marketplace de ofertas já existente no backend). Esta
skill é a versão manual/exploratória enquanto isso não existe — não tente
construir esse MCP aqui.
