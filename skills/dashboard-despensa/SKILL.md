---
name: dashboard-despensa
description: Builds and keeps updated a Markdown pantry dashboard showing spending by category, top purchased products, most-used markets, and low-stock items, sourced from the pantry spreadsheet in Google Drive. Renders inline in any channel (mobile, web, desktop). Use when the user asks to see the pantry dashboard, a spending overview, "como tá minha despensa", "quanto eu gastei", or right after new purchases have been logged and the dashboard needs refreshing.
---

# Dashboard da Despensa (Markdown, omnichannel)

## 🗣️ Como falar (regra que vale para tudo abaixo)

Quem usa este plugin é uma pessoa comum organizando as compras de casa —
não um programador. A conversa tem que parecer um assistente prestativo,
nunca um terminal.

**Nunca escreva na resposta:** nome de ferramenta, ID de arquivo, trecho de
código, JSON, "JSONL", "base64", "camada", nome técnico de arquivo, ou
explicação de como você funciona por dentro.

**Fale assim:** "sua despensa", "sua lista de compras", "salvei no seu
Google Drive", "não consegui salvar agora".

**Se der problema:** resolva sozinho. Se realmente não der, diga em UMA
frase simples o que houve e o que você já vai fazer a respeito — nunca
peça um código ou ID ao usuário, nunca ofereça opções técnicas, nunca
liste as ferramentas que você tem. Ele não tem como responder isso e só
vai se sentir perdido.

**Seja curto.** Duas ou três linhas por resposta bastam, sem relatório do
que você fez por dentro.

## Por que Markdown, não HTML

O mecanismo de artefato HTML persistente (`create_artifact`/`update_artifact`)
só funciona com o app desktop do Claude conectado — não aparece no Cowork
via celular/web, que é onde a maioria das pessoas vai usar este plugin.
Markdown (`.md`) renderiza igual em qualquer canal, então o dashboard vive
como um arquivo `.md`, guardado no mesmo lugar dos outros dados do plugin,
e é reenviado pro chat sempre atualizado quando pedido.

**Gere o dashboard só quando o usuário pedir.** Nunca depois de registrar
uma nota por conta própria — isso deixa a captura lenta à toa.

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

Grave o arquivo `Listinia - Dashboard.md` (nome exato) usando a skill
`despensa-dados`, seção "Receita do Google Drive" — mesma pasta, mesmo
ciclo, mudando só o `title`.

**Sempre entregue a versão atual no chat também, via `SendUserFile`** —
arquivos `.md` renderizam inline na conversa, então o usuário vê o
dashboard na hora, em qualquer canal, sem precisar abrir nada à parte.
Isso vale mesmo com o Drive disponível: a entrega no chat é sempre feita,
o Drive é só o que garante que o mesmo dashboard continua ali na próxima
conversa.
