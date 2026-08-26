---
name: pesquisa-encartes-mercado
description: Registers the user's preferred supermarkets (name, address, website, flyer/offers page) and researches current promotions on those sites via the browser to estimate prices for a shopping list. Use when the user wants to add or update a preferred market, check current supermarket offers/encartes, or wants their shopping list with an estimated price and the cheapest option per item.
---

# Pesquisa de Encartes de Supermercado

Delegue ao agente **`listinia-navegador`** (ferramenta `Agent`) — é o único
com o navegador. Ele varre os sites e devolve as ofertas cruas; o
cruzamento com a lista e a conta ficam com você (ou com o orquestrador).

**Isto é funcionalidade nova** — não existe no app Listinia real, onde o
encarte é o próprio supermercado que sobe. Aqui a pessoa pesquisa direto
nos sites dos mercados que escolher.

## Mercados preferidos

O servidor listinIA ainda não guarda mercados preferidos. Então:

- Se houver uma pasta conectada nesta sessão, salve `mercados.json` lá e
  releia dela nas próximas vezes.
- Sem pasta, pergunte na hora — e não repita a pergunta dentro da mesma
  conversa.

Peça de 3 a 5 mercados: nome, endereço, site e, se a pessoa souber, a
página de encartes/ofertas. Não souber a página → o `listinia-navegador`
localiza (procurando "Ofertas", "Encartes", "Promoções") e devolve o
endereço.

Já existindo a lista, "adiciona esse mercado" ou "troca o X pelo Y" edita
só o que mudou — não peça os outros de novo.

## Cruzamento com a lista

1. Para cada item da lista, procure correspondência nas ofertas que
   voltaram, por nome e categoria.
2. Havendo preço em mais de um mercado, aponte o mais barato.
3. Sem preço em nenhum → **"sem cotação"**. Nunca estime.
4. Some por código o total estimado, deixando explícito que os itens sem
   cotação ficaram de fora da soma.

Entregue: item, quantidade, mercado mais barato (ou "sem cotação"), preço
unitário, e o total estimado.

## 🚫 JAMAIS INVENTAR

- Preço que não estava escrito na página não existe.
- Mercado cujo site bloqueou ou não carregou é dito como tal — não ganha
  preço médio dos outros, nem "por volta de".
- Correspondência aproximada de nome é sugestão: mostre o nome do produto
  como veio da página, para a pessoa julgar se é o mesmo item.
- Não invente o endereço de uma página de ofertas.

## 🗣️ Como falar

Sem nome de ferramenta, de agente ou de arquivo. Se um mercado não deu
retorno, uma frase basta: "o site do X não deixou eu ver as ofertas hoje".

## Roadmap (não implementar agora)

No futuro isso vira um MCP dedicado ligado ao marketplace de ofertas do
backend Listinia, onde os supermercados cadastrados disputam a demanda.
Esta skill é a versão exploratória enquanto isso não existe.
