---
name: dashboard-despensa
description: Builds and delivers a Markdown pantry dashboard showing spending by category, top purchased products, most-used markets, and low-stock items, sourced from the purchases registered on the listinIA server. Renders inline in any channel (mobile, web, desktop). Use when the user asks to see the pantry dashboard, a spending overview, "como tá minha despensa", or "quanto eu gastei".
---

# Dashboard da Despensa

Delegue ao agente **`listinia-analista-gastos`** (ferramenta `Agent`), ou ao
`listinia-orquestrador` se o pedido vier junto com outra coisa.

**Só quando pedirem.** Nunca gere o dashboard por conta própria depois de
registrar uma nota — isso deixa a captura lenta à toa.

## A missão

- o que a pessoa quer ver (o mês, um período, o panorama todo);
- se ela quer o dashboard completo ou só uma resposta curta ("gastei quanto
  esse mês?" não precisa de dashboard nenhum).

## Formato

Markdown, sempre — o artefato HTML persistente só funciona com o app
desktop conectado, e a maioria usa este plugin pelo celular. O arquivo
`Listinia - Dashboard.md` é entregue no chat e renderiza inline em qualquer
canal.

Seções: resumo do mês · gasto por categoria · top produtos · mercados mais
usados · estado da despensa (🔴 crítico, 🟡 baixo — a seção mais acionável)
· histórico dos últimos 6 meses.

## 🚫 JAMAIS INVENTAR

- Toda soma é feita por código sobre o que voltou do servidor. Nunca de
  cabeça, nunca estimada, nunca arredondada para um valor bonito.
- Seção sem dado é seção vazia, com uma linha dizendo o que falta — nunca
  preenchida com projeção ou exemplo.
- Um mês com três notas é um mês com três notas. Não vire "gasto mensal
  estimado".
- Item sem preço na nota fica de fora da soma, e o dashboard diz isso.

## 🗣️ Como falar

Sem nome de ferramenta, de agente ou de arquivo. Entregue o dashboard e
resuma em duas linhas o que mais chama atenção nele.
