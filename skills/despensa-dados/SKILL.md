---
name: despensa-dados
description: Manages the user's pantry (despensa) as an append-only JSONL event log — logs every approved purchase and manual adjustment, computes current quantity and days-of-stock-remaining per item using category shelf-life defaults, and can export the current state as an XLSX spreadsheet on demand. Use when the user asks to update the pantry, check what's running low or about to expire, adjust an item's quantity by hand, add or remove an item manually, wants a spreadsheet export, or right after a receipt has just been captured and confirmed.
---

# Gestão da Despensa (JSONL + exportação XLSX)

## Onde os dados moram

Leia `references/persistencia.md` primeiro — define a estratégia em
camadas (Google Drive → anexo manual → só a sessão). Todo esse arquivo
assume que você já carregou o `despensa.jsonl` real, ou confirmou que é a
primeira vez de verdade.

## Por que JSONL, não XLSX direto

`despensa.jsonl` é um log de eventos, append-only — cada linha é um JSON
independente. Isso é muito mais simples e seguro de atualizar do que abrir
e reescrever um binário `.xlsx` toda vez (sem risco de corromper
formatação, sem precisar "achar a linha certa pra editar"). O `.xlsx` só
existe como **exportação sob demanda**, gerada na hora a partir do JSONL
quando o usuário quer baixar uma planilha — siga a skill `xlsx` para gerar
esse export com boas práticas.

## Schema do `despensa.jsonl` (um JSON por linha)

**Evento de compra** (uma linha por item de uma nota aprovada):
```json
{"tipo": "compra", "data": "YYYY-MM-DD", "nota_numero": "...", "mercado": "...", "item": "Nome Normalizado", "categoria": "...", "qtd": 2, "unidade": "L", "preco_unitario": 5.50, "preco_total": 11.00}
```

**Evento de ajuste manual** (usuário corrigindo a quantidade à mão):
```json
{"tipo": "ajuste", "data": "YYYY-MM-DD", "item": "Nome Normalizado", "qtd_atual_nova": 1, "motivo": "uso manual"}
```

**Evento de checagem visual** (skill `checagem-visual-despensa`):
```json
{"tipo": "checagem_visual", "data": "YYYY-MM-DD", "item": "Nome Normalizado", "confirmado_presente": true}
{"tipo": "checagem_visual", "data": "YYYY-MM-DD", "item": "Nome Normalizado", "confirmado_ausente": true}
```

Nunca edite ou apague uma linha existente — sempre **acrescente** uma nova
linha ao final do arquivo. O estado atual é sempre calculado a partir do
histórico completo, nunca guardado como "verdade fixa" em outro lugar.

## ⚠️ TRAVA — nunca some quantidade "de cabeça" ou por semelhança de nome

Este é o ponto mais perigoso do plugin: se duas compras do mesmo item em
**datas diferentes** forem somadas errado, ou se dois itens **parecidos
mas diferentes** forem fundidos em um só, o estoque calculado fica errado
e todo o resto (dias restantes, lista de compras, dashboard) sai errado
atrás.

Regras obrigatórias:

1. **Calcule por código, nunca de cabeça.** Escreva e rode um script
   (Python) que leia o `despensa.jsonl` linha a linha e aplique
   exatamente o algoritmo da seção abaixo. Não estime ou some
   mentalmente, mesmo que pareça poucos itens — é exatamente aí que erro
   de soma entre datas diferentes acontece.
2. **Agrupamento é por nome normalizado EXATO** (mesmo Title Case), não
   por "parece o mesmo produto". "Leite Integral 1L" e "Leite
   Desnatado 1L" são itens DIFERENTES mesmo compartilhando "Leite" — nunca
   funda dois nomes distintos num grupo só por similaridade textual
   automaticamente. Se dois nomes provavelmente são o mesmo produto
   escrito diferente (ex.: nota fiscal abreviada), a normalização de nome
   acontece **uma vez, no momento de registrar a compra** (skill
   `captura-nota-fiscal`, com confirmação do usuário) — nunca depois, ao
   calcular o estado.
3. **A soma de quantidade só existe dentro do algoritmo de "Qtd Atual"
   abaixo** (compras desde o último ajuste/checagem, na ordem
   cronológica correta). Nenhuma outra skill (`gerador-lista-compras`,
   `dashboard-despensa`, etc.) tem permissão para recalcular ou "ajustar"
   essa soma — elas só **leem** o resultado já calculado aqui. Se uma
   etapa de LLM (ex.: normalizar nomes pra exibição na lista de compras)
   tocar nesses números, é sempre para exibir o mesmo valor, nunca para
   somar de novo ou estimar um novo total.

## Como calcular o estado atual de um item

Para cada item (agrupando por nome normalizado, Title Case):

1. **Qtd Atual** = soma das quantidades de todos os eventos `compra` desse
   item, **desde o último evento** `ajuste`/`checagem_visual` (que
   sobrescreve o valor acumulado até ali — `qtd_atual_nova` ou `0` se
   `confirmado_ausente`). Depois desse ponto, volta a somar as compras
   seguintes normalmente.
2. **Consumo Médio** = quantidade do evento `compra` mais recente desse
   item (mesma lógica do app real — atualiza a cada nova compra).
3. **Última Compra** = data do evento `compra` mais recente.
4. **Categoria**: classifique usando `references/categorias.md`
   (comparação de keywords no nome, minúsculo; fallback = "outros"). Se o
   usuário personalizou a duração de alguma categoria (`config-habitos.json`
   — mesma lógica de persistência), use o valor customizado.

### Fórmula de Dias Restantes (idêntica à do app real)

```
dias_totais = max(1, round((qtd_atual / consumo_medio) * duracao_categoria))
previsao_fim = ultima_compra + dias_totais dias
dias_restantes = max(0, (previsao_fim - hoje).dias)
```

### Status (mesmos limiares do app real)

- **crítico**: dias_restantes < 25% da duração da categoria
- **baixo**: 25%–60% da duração da categoria
- **ok**: acima de 60% da duração da categoria

## Ao registrar uma nova compra (chamado pela skill `captura-nota-fiscal`)

Carregue o `despensa.jsonl` real (`references/persistencia.md`). Para cada
item confirmado pelo usuário, normalize o nome (Title Case, evita
duplicar por causa de maiúsculas/minúsculas), classifique a categoria, e
**acrescente uma linha `compra`** — nunca reescreva linhas antigas. Salve
de volta na camada de persistência ativa seguindo `references/persistencia.md`
(Drive: procurar na pasta dedicada e recriar o arquivo — nunca `update_file`;
manual: ofereça o arquivo pra download no fim da conversa).

## Ajuste manual

Se o usuário disser algo como "já usei metade do arroz" ou "tira o
detergente da despensa", **acrescente um evento `ajuste`** com a nova
quantidade (ou `0` se removido), recalcule Dias Restantes com base no novo
estado, e salve.

## Exportação para XLSX (sob demanda)

Se o usuário pedir a planilha, uma cópia pra abrir no Excel, ou algo
parecido: calcule o estado atual de todos os itens (seção acima), gere um
`.xlsx` com duas abas — "Compras" (todas as linhas `compra` do JSONL,
como log) e "Despensa" (estado atual calculado, uma linha por item) — e
entregue via `SendUserFile`. Siga a skill `xlsx` pra formatação. Deixe
claro que essa planilha é uma fotografia do momento — a fonte de verdade
continua sendo o `despensa.jsonl`.

## Ao ser chamada para "ver o que está acabando"

Carregue o `despensa.jsonl` real (nunca comece do zero). Calcule o estado
atual e liste os itens com status crítico ou baixo, ordenados por Dias
Restantes crescente, em resposta curta e direta — sem tabela gigante a
menos que o usuário peça.
