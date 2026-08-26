---
name: despensa-dados
description: Manages the user's pantry (despensa) on the listinIA server — registers purchases, adjusts or removes a product by hand, reads current stock with days-of-stock-remaining and status, and exports the pantry as an XLSX spreadsheet on demand. Use when the user asks to update the pantry, check what's running low or about to expire, adjust an item's quantity by hand, add or remove an item manually, wants a spreadsheet export, or right after a receipt has just been captured and confirmed.
---

# Gestão da Despensa

A despensa vive no **servidor listinIA** — fonte única de verdade. Não
existe arquivo JSONL, planilha-fonte, Google Drive nem sincronização entre
canais: o mesmo estado aparece no celular, na web e no desktop porque está
no servidor, não em um arquivo.

Quem escreve nela é **um agente só**: `listinia-despensor`. Delegue a ele
(ferramenta `Agent`) — ou ao `listinia-orquestrador`, quando o pedido tiver
mais de um passo.

## Consulta rápida

"O que tem em casa?", "o que está acabando?" — chame direto
`despensa_listar` ou `despensa_status`. Os dias restantes, o status
(crítico / baixo / ok) e a categoria já vêm calculados pelo servidor:
**use como vieram, nunca recalcule de cabeça.**

## Registrar uma compra

Missão para o `listinia-despensor`, com os itens já conferidos e a
confirmação da pessoa dita com todas as letras. Uma chamada de
`nota_registrar` grava a nota, os itens e soma tudo na despensa de uma vez.

Mande sempre a **chave da NFC-e** quando existir — é o que impede a mesma
nota de ser gravada duas vezes.

## Ajuste manual

"Já usei metade do arroz", "acabou o detergente", "comprei fora e quero
adicionar", "tira isso da despensa" → missão para o `listinia-despensor`,
sem cerimônia. Isso é correção; compra inteira sempre vai por
`nota_registrar`.

## Exportar XLSX

Só quando pedirem. O `listinia-despensor` gera o `.xlsx` a partir do estado
atual e entrega no chat. Deixe claro que a planilha é uma fotografia do
momento — a despensa viva continua no servidor.

## 🚫 JAMAIS INVENTAR

- Campo que não foi lido com clareza **não é gravado**: volta como
  pendência para a pessoa decidir.
- Nunca some de cabeça, nunca funda itens por nome parecido ("Arroz" e
  "Arroz Integral" são dois produtos), nunca recalcule status ou categoria.
- Nunca grave sem confirmação explícita.
- Nota errada se apaga (`nota_remover`) e se registra de novo — não se
  corrige por cima.

## 🗣️ Como falar

Quem usa isto organiza as compras de casa, não é programador. Nunca escreva
nome de ferramenta, de agente, de arquivo, JSON ou código na resposta. Fale
"sua despensa", "salvei aqui", "não consegui gravar agora". Duas ou três
linhas bastam.
