---
name: dashboard-despensa
description: Builds and keeps updated a Markdown pantry dashboard showing spending by category, top purchased products, most-used markets, and low-stock items, sourced from the pantry spreadsheet in Google Drive. Renders inline in any channel (mobile, web, desktop). Use when the user asks to see the pantry dashboard, a spending overview, "como tá minha despensa", "quanto eu gastei", or right after new purchases have been logged and the dashboard needs refreshing.
---

# Dashboard da Despensa (Markdown, omnichannel)

## Por que Markdown, não HTML

O mecanismo de artefato HTML persistente (`create_artifact`/`update_artifact`)
só funciona com o app desktop do Claude conectado — não aparece no Cowork
via celular/web, que é onde a maioria das pessoas vai usar este plugin.
Markdown (`.md`) renderiza igual em qualquer canal, então o dashboard vive
como um arquivo `.md`, seguindo a mesma estratégia de persistência em
camadas dos outros dados do plugin (veja
`despensa-dados/references/persistencia.md`: Google Drive → anexo manual
→ só a sessão), e é reenviado pro chat sempre atualizado quando pedido.

## Fonte de dados

Carregue o `despensa.jsonl` real (skill `despensa-dados` — nunca leia um
arquivo novo/vazio) e calcule o estado atual a partir dele. Nunca invente
números: se uma seção não tiver dados suficientes (ex.: usuário ainda não
registrou nenhuma compra), mostre um estado vazio explicando o que falta,
em vez de estimar.

## Seções do dashboard

1. **Resumo do mês**: total gasto no mês corrente, número de notas
   registradas, comparação com o mês anterior (se houver dado).
2. **Gasto por categoria**: tabela com categoria, valor gasto e % do
   total, ordenada do maior pro menor gasto.
3. **Top produtos**: tabela dos itens mais comprados por frequência e por
   gasto acumulado.
4. **Mercados mais usados**: tabela com mercado e número de notas.
5. **Estado da despensa**: lista dos itens com status crítico/baixo,
   ordenados por dias restantes — a seção mais acionável, destaque com
   negrito ou emoji (🔴 crítico, 🟡 baixo).
6. **Histórico de gasto**: tabela de gasto por mês, últimos 6 meses.

Use tabelas Markdown simples para os números — sem tentar recriar gráficos
complexos em texto. Se quiser um indicativo visual rápido de proporção,
pode usar blocos de caractere (ex.: `███████░░░` ao lado do %), mas mantenha
simples e legível.

## Persistência (importante)

Siga `despensa-dados/references/persistencia.md` para o arquivo
`Listinia - Dashboard.md` (nome exato, para a busca sempre achar o
mesmo arquivo nas próximas vezes).

**Sempre entregue a versão atual no chat também, via `SendUserFile`** —
arquivos `.md` renderizam inline na conversa, então o usuário vê o
dashboard na hora, em qualquer canal, sem precisar abrir nada à parte.
Isso vale mesmo quando a Camada 1 (Drive) está disponível — a entrega no
chat é sempre feita, o Drive é só o que garante que o mesmo dashboard
continua ali na próxima conversa.
