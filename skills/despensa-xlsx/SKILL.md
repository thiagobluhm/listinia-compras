---
name: despensa-xlsx
description: Manages the user's pantry (despensa) as an XLSX workbook — logs every approved purchase, keeps a running quantity per item, classifies items into categories, and computes days-of-stock-remaining per item using category shelf-life defaults. Use when the user asks to update the pantry, check what's running low or about to expire, adjust an item's quantity by hand, add or remove an item manually, or right after a receipt has just been captured and confirmed.
---

# Gestão da Despensa (XLSX)

Antes de mexer no arquivo, siga a skill `xlsx` para as boas práticas de
leitura/escrita de planilha (biblioteca recomendada, preservação de
formatação, múltiplas abas). Esta skill aqui define o *schema* e a *lógica
de negócio* — a skill `xlsx` cuida da mecânica do arquivo.

Arquivo: `despensa.xlsx` na pasta de trabalho da sessão. Se não existir,
crie com as duas abas abaixo.

## Aba "Compras" (log bruto, append-only — nunca edite linhas antigas)

| Data | Nº Nota | Mercado | Item | Categoria | Qtd | Unidade | Preço Unit. | Preço Total |
|---|---|---|---|---|---|---|---|---|

Uma linha por item de cada nota aprovada. É o histórico completo — a fonte
de verdade para o dashboard e para entender o padrão de consumo real.

## Aba "Despensa" (estado atual — uma linha por item único)

| Item | Categoria | Qtd Atual | Unidade | Consumo Médio | Última Compra | Duração Categoria (dias) | Dias Restantes | Previsão de Fim | Status |
|---|---|---|---|---|---|---|---|---|---|

- **Consumo Médio**: quantidade da compra mais recente desse item (é assim
  que o app real estima consumo — atualiza a cada nova compra do mesmo item).
- **Duração Categoria**: veja `references/categorias.md` para a tabela
  completa de categorias, keywords e durações padrão (ex.: hortifrúti = 5
  dias, laticínios = 10, limpeza = 45). Se o usuário tiver personalizado a
  duração de alguma categoria (ver skill `gerador-lista-compras` /
  `config-habitos.json`), use o valor customizado no lugar do default.

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

Para cada item confirmado:

1. Adicione uma linha na aba "Compras" com os dados da nota.
2. Classifique o item por categoria usando `references/categorias.md`
   (comparação de keywords no nome, minúsculo; fallback = "outros").
3. Normalize o nome para Title Case para evitar duplicar o mesmo item por
   causa de maiúsculas/minúsculas diferentes (ex.: "LEITE" e "leite" são o
   mesmo item).
4. Procure o item na aba "Despensa" (case-insensitive). Se já existir:
   some a quantidade da nova compra à Qtd Atual, atualize Consumo Médio
   para a quantidade desta compra, atualize Última Compra e recalcule Dias
   Restantes/Previsão/Status. Se não existir: crie uma linha nova.

## Ajuste manual

Se o usuário disser algo como "já usei metade do arroz" ou "tira o
detergente da despensa", edite diretamente a Qtd Atual do item (ou marque
como removido) e recalcule Dias Restantes.

## Ao ser chamada para "ver o que está acabando"

Liste os itens com status crítico ou baixo, ordenados por Dias Restantes
crescente, em uma resposta curta e direta — sem tabela gigante a menos que
o usuário peça.
