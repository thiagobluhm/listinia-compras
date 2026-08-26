---
name: desempenho-do-encarte
description: Shows the retailer how their published flyer actually performed — qualified reach, list capture, purchases confirmed by real receipts, and whether the price charged matched the price advertised. Use when the retailer asks "meu encarte funcionou?", "quantas pessoas compraram", "qual o retorno das minhas ofertas", "vale a pena anunciar aqui", "quero o relatório", or asks how Listinia measures results.
---

# Desempenho do Encarte

Conduza diretamente no Codex usando `desempenho_encarte`. Preserve campos
nulos e as regras de anonimato exatamente como vierem do servidor.

## O que este relatório é — e por que ele é diferente

Banner e encarte de papel medem **atenção**: view, clique, tiragem. São
proxies inventados porque o anunciante não enxerga a compra.

Aqui o dado primário **é a compra**. O consumidor captura a nota fiscal no
Listinia, então dá para dizer que a oferta apareceu para quem precisava
daquele item, que ele foi ao mercado e que aquele item saiu na nota, naquele
preço. Isso não é estimativa de conversão. É a conversão.

Diga isso ao lojista com essas palavras. É o argumento comercial inteiro.

## Os quatro estágios

1. **Alcance qualificado** — pessoas para quem a oferta apareceu **porque
   tinham aquele item na lista**, e tinham porque a despensa delas indicava
   que estava acabando. Não é impressão: é intenção de compra declarada pelo
   consumo real.
2. **Captura da lista** — em quantas dessas a oferta da loja foi a mais
   barata e ganhou o item. Estar na lista e vencer a lista são coisas
   diferentes.
3. **Compra confirmada** — nota fiscal daquela loja, dentro da vigência, com
   aquele item. É o loop fechado.
4. **Aderência de preço** — o cobrado bateu com o anunciado. Isso é
   conformidade, não marketing: no Brasil oferta anunciada vincula, e o
   lojista quer saber antes do cliente reclamar.

Busca aparece **em separado** de lista, sempre. Quem procurou o produto vale
menos que quem já ia comprar, e juntar os dois infla o número.

## 🚫 JAMAIS INVENTAR — aqui o risco é comercial

Este relatório vira argumento de venda e base de precificação. Número
inflado aqui não é bug: é promessa que não se cumpre na renovação.

- **Nunca preencha um campo que voltou nulo.** Nulo significa que a célula
  ficou abaixo do piso de anonimato — diga isso, não estime.
- **Nunca some, projete ou anualize.** "12 compras em uma semana" não vira
  "~600 por ano".
- **Nunca chame de incremental.** Isto é venda **atribuída**. Se a pessoa
  compraria de qualquer jeito, o relatório não sabe. Quando o lojista
  perguntar — e ele vai — a resposta honesta é: medir incremental exige
  segurar as ofertas de uma fatia dos usuários para comparar, e isso ainda
  não existe.
- **Diga que o número subconta.** O casamento entre oferta e item da nota é
  exato: EAN igual, ou nome idêntico. Nome parecido não é atribuído. O
  resultado real é igual ou maior, nunca menor — e isso é uma vantagem
  comercial, não uma desculpa.

## Privacidade não é rodapé

O lojista recebe **coorte, nunca pessoa**. Célula com menos compradores que o
piso volta nula e assim é apresentada. Nunca produza recorte que permita
identificar alguém por eliminação — bairro pequeno com três compradores é
uma pessoa identificável.

Se o lojista pedir a lista de quem comprou, a resposta é não, e o motivo é
dito em uma frase: é o que mantém o consumidor confiando no Listinia, que é o
que dá valor ao anúncio dele.

## Quando não há número ainda

Encarte recém-publicado, ou base pequena, devolve pouca coisa. **Diga isso
com todas as letras** em vez de encher o relatório. E aponte o que aumenta o
número de verdade: mais itens com código de barras (casam melhor), e o
apelido do cupom cadastrado.

## O apelido do cupom — a causa nº 1 de relatório vazio

A nota do cliente traz o nome impresso no cupom ("BOM PRECO COM DE ALIM
LTDA"), que raramente é igual ao nome cadastrado ("Mercado Bom Preço -
Centro"). Sem o vínculo, **a compra existe e não é contabilizada**.

Se o alcance for alto e a compra confirmada for zero, suspeite disso antes de
qualquer outra coisa, e peça ao lojista o nome exato como sai no cupom dele.
É uma pergunta, uma vez, e conserta o relatório inteiro.
