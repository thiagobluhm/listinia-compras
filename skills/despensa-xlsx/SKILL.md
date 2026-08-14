---
name: despensa-xlsx
description: Manages the user's pantry (despensa) as an XLSX workbook — logs every approved purchase, keeps a running quantity per item, classifies items into categories, and computes days-of-stock-remaining per item using category shelf-life defaults. Use when the user asks to update the pantry, check what's running low or about to expire, adjust an item's quantity by hand, add or remove an item manually, or right after a receipt has just been captured and confirmed.
---

# Gestão da Despensa (XLSX)

Antes de mexer no arquivo, siga a skill `xlsx` para as boas práticas de
leitura/escrita de planilha (biblioteca recomendada, preservação de
formatação, múltiplas abas). Esta skill aqui define o *schema*, a *lógica
de negócio* e — muito importante — **onde o arquivo mora de verdade**.

## ⚠️ Persistência — leia isto antes de criar qualquer planilha

Cada conversa nova do Cowork abre um espaço de trabalho vazio. Se você
simplesmente criar `despensa.xlsx` na pasta de trabalho da sessão sem
verificar antes, o usuário acaba com uma despensa nova (e vazia) toda vez
que abre um chat — isso é o bug mais crítico que este plugin pode ter, e a
prioridade número um é evitá-lo.

**Regra de ouro: nunca crie uma planilha nova sem antes checar se já existe
uma.** Siga esta ordem, sempre:

1. **Cheque a memória do projeto**, se as ferramentas
   `project_memory_read`/`project_memory_write` estiverem disponíveis
   nesta sessão. Procure uma nota (ex.: arquivo `listinia-despensa.md`)
   com o caminho salvo do `despensa.xlsx` no computador do usuário.
   - Se encontrar um caminho salvo: use as ferramentas de dispositivo
     (`device_stage_files`) para carregar o arquivo real de lá, trabalhe
     em cima dele, e ao final grave de volta no mesmo caminho
     (`device_commit_files`). **Este é o arquivo real — nunca crie outro
     do zero enquanto este existir.**
2. **Se não houver caminho salvo, mas houver um dispositivo/pasta
   conectado** (ferramentas `mcp__remote-devices__*` disponíveis e
   funcionando): pergunte ao usuário, uma única vez, em qual pasta do
   computador dele você deve manter a despensa salva permanentemente
   (ex.: a mesma pasta do projeto). Crie `despensa.xlsx` lá, e **salve
   esse caminho na memória do projeto** para todas as próximas vezes não
   precisarem perguntar de novo.
3. **Se não houver dispositivo conectado** (ex.: sessão só no celular, sem
   o app desktop aberto): avise o usuário claramente, logo no início, que
   esta despensa vai existir **só durante esta conversa** — ela não vai
   sobreviver quando o chat for fechado, porque não há onde salvá-la de
   forma permanente. Sugira abrir o Cowork pelo app desktop (com a pasta
   do projeto conectada) quando quiser que os dados persistam de verdade.
   Ofereça também baixar o `.xlsx` gerado (via entrega de arquivo) para o
   usuário guardar manualmente, como paliativo.
4. Nunca prossiga silenciosamente com a opção 3 sem avisar — o usuário
   precisa saber, na hora, se o que está sendo criado é permanente ou não.

## Arquivo

`despensa.xlsx` — local definido pela lógica de persistência acima. Se não
existir ainda (primeira vez), crie com as duas abas abaixo.

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
  `config-habitos.json` — mesma pasta persistente do `despensa.xlsx`), use
  o valor customizado no lugar do default.

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

Antes de tudo, aplique a lógica de persistência acima — carregue a
planilha real (ou confirme que vai criar uma nova, se for de fato a
primeira vez). Depois, para cada item confirmado:

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
5. Salve de volta no caminho persistente (passo 1 ou 2 da lógica de
   persistência) — nunca deixe a atualização só na pasta de trabalho da
   sessão se houver um caminho permanente disponível.

## Ajuste manual

Se o usuário disser algo como "já usei metade do arroz" ou "tira o
detergente da despensa", carregue a planilha real (lógica de persistência
acima), edite diretamente a Qtd Atual do item (ou marque como removido),
recalcule Dias Restantes e salve de volta no mesmo lugar.

## Ao ser chamada para "ver o que está acabando"

Carregue a planilha real (nunca crie uma nova só para consultar). Liste os
itens com status crítico ou baixo, ordenados por Dias Restantes crescente,
em uma resposta curta e direta — sem tabela gigante a menos que o usuário
peça.
