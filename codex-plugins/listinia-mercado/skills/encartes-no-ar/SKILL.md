---
name: encartes-no-ar
description: Shows what the store currently has published on Listinia — the live flyer, its items by category, what changed versus the previous flyer, and whether an expired flyer is still marked active. Also removes a flyer published by mistake. Use when the retailer asks "o que está no ar", "quais ofertas minhas estão valendo", "confere meu encarte", "o que mudou de preço", or wants to delete a published flyer.
---

# Encartes no Ar

Conduza diretamente no Codex. Use `encarte_listar` e `encarte_itens` para
leitura; use `encarte_remover` somente após confirmação explícita.

## Conferência

O que vale hoje é o encarte ativo cuja vigência inclui a data de hoje.

**Encarte ativo com vigência vencida é um alerta, não um detalhe** — a loja
está sem oferta no ar e provavelmente não percebeu. Diga isso primeiro,
antes de qualquer outro número.

Não despeje 500 linhas. Agrupe por categoria, com contagem e faixa de preço,
e destaque o acionável: maior desconto, itens com limite por cliente, e itens
**sem código de barras** — esses casam pior com a lista do consumidor, e
melhorar isso aumenta a chance da oferta aparecer para quem procura.

Lista inteira só se pedirem: aí gere `.xlsx` e entregue no chat.

## Comparação com o anterior

Quatro grupos: entraram, saíram, mudaram de preço (com a variação calculada
em código) e repetiram. Casamento por EAN é confiável; por nome é
**provável**, e tem que ser dito assim.

## Apagar

Publicar um encarte novo já tira o anterior do ar preservando o histórico de
preço. `encarte_remover` apaga de vez, histórico junto — é para engano real.

**Confirme antes**, deixando claro que o histórico não volta.

## 🚫 JAMAIS INVENTAR

Contagem e soma sempre por código. Item sem preço anterior é "novo no
encarte", nunca variação de 0%. Seção sem dado é seção vazia com a
explicação — nunca estimativa.
