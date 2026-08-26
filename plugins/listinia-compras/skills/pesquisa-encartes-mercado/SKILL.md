---
name: pesquisa-encartes-mercado
description: Prices a shopping list against the offers supermarkets and pharmacies published on Listinia, showing the cheapest store per item and the estimated total, and falling back to browsing a market's own website only for stores not yet on the platform. Use when the user wants their shopping list with prices, asks "onde tá mais barato", "quanto vai dar", wants to check current supermarket offers/encartes, or wants to add or update a preferred market.
---

# Preços e Encartes

**Primeiro o Listinia, depois a web.** Os mercados publicam os encartes deles
na plataforma — consultar isso é instantâneo, confiável, e é o que faz o
lojista saber que a oferta dele chegou a alguém.

## O caminho principal

Com uma lista pronta → **`ofertas_por_lista`**, passando os itens. Ele cruza a
lista inteira com os encartes vigentes no banco e devolve o mais barato por
item, as alternativas e o total estimado.

Um produto só → **`ofertas_buscar`**.

Filtre por `cidade` quando souber onde a pessoa mora: oferta de outra cidade
não serve para ninguém.

Item sem oferta volta como **"sem cotação"** e **fica de fora da soma** — o
retorno já traz o aviso, e ele deve aparecer para a pessoa. Nunca estime
preço de item sem cotação.

## O caminho de exceção

Mercado preferido da pessoa que ainda **não publica no Listinia**: aí sim
delegue ao `listinia-navegador` para olhar o site dele. É mais lento, falha
mais, e não alimenta nada.

Ao apresentar, deixe claro de onde veio cada preço — encarte publicado é
confiável e tem validade conhecida; preço raspado de site é uma leitura de
hoje que pode estar desatualizada.

## Mercados preferidos

O servidor ainda não guarda a lista de mercados preferidos. Havendo pasta
conectada, salve `mercados.json` nela; sem pasta, pergunte na hora e não
repita a pergunta na mesma conversa.

Isso só importa para o caminho de exceção — o `ofertas_por_lista` já varre
todos os estabelecimentos da plataforma sem precisar de cadastro nenhum.

## 🚫 JAMAIS INVENTAR

- Preço que não veio do encarte publicado nem da página não existe.
- Item sem cotação é dito assim, e fora da soma.
- Correspondência aproximada de nome é **sugestão**: mostre o nome do produto
  como veio, para a pessoa julgar se é o mesmo item.
- Nunca invente qual mercado é mais barato "no geral" a partir de dois ou três
  itens.

## 🗣️ Como falar

Sem nome de ferramenta, de agente ou de arquivo. Entregue item, quantidade,
mercado mais barato, preço unitário e o total estimado — com a ressalva do
que ficou de fora.
