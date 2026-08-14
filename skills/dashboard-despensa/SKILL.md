---
name: dashboard-despensa
description: Builds and keeps updated a persistent HTML dashboard (saved as a Cowork artifact) showing pantry status, spending by category, top purchased products, and most-used markets, sourced from despensa.xlsx. Use when the user asks to see the pantry dashboard, a spending overview, "como tá minha despensa", "quanto eu gastei", or right after new purchases have been logged and the dashboard needs refreshing.
---

# Dashboard da Despensa

Antes de montar qualquer gráfico ou layout, siga a skill `dataviz` para
paleta de cores, tipos de gráfico e estilo consistente. Esta skill aqui
define o *conteúdo* do dashboard — a skill `dataviz` cuida da estética.

## Fonte de dados

Leia `despensa.xlsx` (abas "Compras" e "Despensa" — ver skill
`despensa-xlsx` para o schema). Nunca invente números: se uma seção não
tiver dados suficientes (ex.: usuário ainda não registrou nenhuma compra),
mostre um estado vazio explicando o que falta, em vez de estimar.

## Seções do dashboard

1. **Resumo do mês**: total gasto no mês corrente, número de notas
   registradas, comparação com o mês anterior (se houver dado).
2. **Gasto por categoria**: soma de "Preço Total" agrupado por "Categoria"
   na aba Compras — gráfico de barras ou pizza (siga `dataviz`).
3. **Top produtos**: os itens mais comprados por frequência (contagem de
   linhas por "Item" na aba Compras) e por gasto acumulado.
4. **Mercados mais usados**: contagem de notas por "Mercado".
5. **Estado da despensa**: itens com status crítico/baixo (aba Despensa),
   destacados com urgência visual — é a seção mais acionável do dashboard.
6. **Histórico de gasto**: gasto por mês, últimos 6 meses, para mostrar
   tendência.

## Persistência (importante)

Este dashboard deve ser um artefato que o usuário reabre e atualiza — não
um arquivo novo a cada pedido.

1. Escreva o HTML autocontido (CSS/JS inline) em um arquivo local.
2. Chame `SendUserFile` para obter o `file_uuid`.
3. Verifique se já existe um artefato chamado `dashboard-despensa` (liste
   os artefatos existentes). Se não existir, crie com `create_artifact`
   usando o id `dashboard-despensa`. Se já existir, atualize no lugar com
   `update_artifact` em vez de criar um novo.
