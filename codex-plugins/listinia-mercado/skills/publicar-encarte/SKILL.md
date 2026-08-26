---
name: publicar-encarte
description: Publishes the store's promotional flyer (encarte) on Listinia from a spreadsheet or data file (csv, xlsx or json), mapping the store's own columns to the platform contract, showing a preview for approval, and replacing the previous flyer only after the new one is fully in. Use when the retailer says "sobe esse encarte", "publica as ofertas da semana", "manda essa planilha de promoção pro Listinia", or attaches a flyer/price file.
---

# Publicar Encarte

Conduza diretamente no Codex: leia a planilha com a capacidade de
planilhas, monte a prévia, obtenha confirmação e só então use
`encarte_publicar`.

## A missão

- o pedido do lojista, nas palavras dele;
- o arquivo anexado;
- a vigência, se ele já disse.

## Fluxo obrigatório

1. **Coluna ambígua vira pergunta, nunca palpite.** Planilha de mercado
   costuma ter duas colunas de preço. Mostre as primeiras linhas das duas e
   pergunte qual é a promocional. É a diferença entre publicar oferta e
   publicar prejuízo.

2. **Sem vigência, não sobe.** Se o arquivo não trouxer as datas, pergunte.
   Nunca assuma a semana corrente.

3. **Prévia obrigatória antes do ar**, com quatro números: quantos itens
   entram, quantos foram rejeitados e por quê, o período, e uma amostra com
   o preço que será publicado. O lojista confirma; só então publica.

4. **Rejeições são mostradas na íntegra**, com motivo em português. O lojista
   vai imprimir encarte de papel — precisa saber o que não subiu.

5. **Publicar substitui o encarte anterior**, e o servidor só tira o antigo
   do ar depois que o novo entrou inteiro. Nunca há uma janela sem oferta.

6. **Depois de publicar, pare.** Uma linha: quantos itens, até quando vale,
   o que ficou de fora. Sem relatório, sem oferecer serviço extra.

## 🚫 JAMAIS INVENTAR

Oferta anunciada vincula: pelo Código de Defesa do Consumidor, o preço
publicado obriga a loja a cumprir. Nome truncado vai como está, unidade não
se converte de cabeça, `preco_de` sem origem no arquivo fica vazio, EAN
inválido é pendência e não erro de digitação a corrigir. **Na dúvida, não
publica — pergunta.**

O contrato de colunas aceitas está em
`references/contrato-encarte.md`, relativo à raiz deste plugin.
