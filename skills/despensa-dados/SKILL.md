---
name: despensa-dados
description: Manages the user's pantry (despensa) as an append-only JSONL event log — logs every approved purchase and manual adjustment, computes current quantity and days-of-stock-remaining per item using category shelf-life defaults, and can export the current state as an XLSX spreadsheet on demand. Use when the user asks to update the pantry, check what's running low or about to expire, adjust an item's quantity by hand, add or remove an item manually, wants a spreadsheet export, or right after a receipt has just been captured and confirmed.
---

# Gestão da Despensa

Esta skill é a **única** que lê e grava os arquivos de dados do plugin.
As outras skills nunca gravam direto — sempre passam por aqui.

Tudo que você precisa está neste arquivo. **Não procure arquivos de
referência, não faça buscas exploratórias, não peça permissão pra começar.**
Registrar uma nota são 4 chamadas de ferramenta e deve levar segundos.

---

## 1. Onde os dados moram

Quatro arquivos, todos no mesmo lugar:

| Arquivo | Conteúdo |
|---|---|
| `despensa.jsonl` | Log de eventos: compras, ajustes, checagens visuais |
| `mercados.json` | Mercados preferidos (skill `pesquisa-encartes-mercado`) |
| `config-habitos.json` | Frequência de compra e durações customizadas |
| `Listinia - Dashboard.md` | Dashboard (skill `dashboard-despensa`) |

**Se as ferramentas do Google Drive existirem nesta sessão, use o Drive e
pronto** — não pergunte ao usuário onde salvar, não ofereça alternativas,
não explique camadas. Só avise em uma linha o que fez ("salvei no seu
Drive, pasta Listinia Compras"). Se o Drive não existir, veja a seção 6.

---

## 2. Receita do Google Drive (testada — siga exatamente)

### 2.1 Achar a pasta (1ª chamada)

```
search_files:
  query = "title = 'Listinia Compras' and mimeType = 'application/vnd.google-apps.folder'"
  excludeContentSnippets = true
```

Achou → guarde o `id` como `PASTA_ID`.
Não achou → crie e guarde o `id`:

```
create_file:
  title = "Listinia Compras"
  contentMimeType = "application/vnd.google-apps.folder"
```

### 2.2 Achar o arquivo (2ª chamada)

```
search_files:
  query = "parentId = '<PASTA_ID>' and title = 'despensa.jsonl'"
  excludeContentSnippets = true
```

Se voltar mais de um arquivo, use o de `createdTime` mais recente e mande
os outros pro lixo com `trash_file` (é sobra de uma gravação interrompida).

### 2.3 Ler o conteúdo (3ª chamada)

```
download_file_content: fileId = "<id do arquivo>"
```

Volta `content` em **base64** — decodifique pra texto (uma linha JSON por
linha do arquivo).

> ⚠️ Não use `read_file_content` — ela não suporta `text/plain` e vai
> falhar com nossos arquivos.

### 2.4 Gravar (4ª e 5ª chamadas)

Não existe "sobrescrever" no Drive aqui. Gravar = **criar novo e descartar
o velho**, nesta ordem (se a criação falhar, o antigo continua intacto):

```
create_file:
  title = "despensa.jsonl"
  parentId = "<PASTA_ID>"
  contentMimeType = "text/plain"
  disableConversionToGoogleType = true      ← OBRIGATÓRIO
  textContent = "<conteúdo antigo + linhas novas>"
```

```
trash_file: fileId = "<id do arquivo antigo>"
```

Só então diga ao usuário que salvou.

### ⚠️ Três erros que travam tudo — nunca cometa

1. **`update_file` não grava conteúdo.** Ela só renomeia ou move de pasta
   (`title`, `parentId`). Não tem parâmetro de conteúdo. Chamar ela pra
   salvar dado não salva nada.
2. **Sem `disableConversionToGoogleType = true`, o Drive converte o
   arquivo em Google Doc** — o `.jsonl` deixa de ser texto puro e a
   leitura seguinte volta corrompida.
3. **Não use `trashed` na query do `search_files`** — esse termo não
   existe nessa ferramenta e quebra a busca. Não precisa: arquivo no lixo
   já não aparece nos resultados.

Os outros três arquivos (`mercados.json`, `config-habitos.json`,
`Listinia - Dashboard.md`) seguem exatamente a mesma receita, mudando só o
`title`. O `fileId` muda a cada gravação — nunca guarde um `fileId` de uma
conversa pra outra, sempre reache por pasta + nome.

---

## 3. Schema do `despensa.jsonl`

Um JSON por linha. **Nunca edite nem apague uma linha existente — sempre
acrescente no final.** O estado atual é sempre recalculado do histórico.

**Compra** (uma linha por item de uma nota aprovada):
```json
{"tipo": "compra", "data": "YYYY-MM-DD", "nota_numero": "...", "mercado": "...", "item": "Nome Normalizado", "categoria": "...", "qtd": 2, "unidade": "L", "preco_unitario": 5.50, "preco_total": 11.00}
```

**Ajuste manual** (usuário corrigindo à mão):
```json
{"tipo": "ajuste", "data": "YYYY-MM-DD", "item": "Nome Normalizado", "qtd_atual_nova": 1, "motivo": "uso manual"}
```

**Checagem visual** (skill `checagem-visual-despensa`):
```json
{"tipo": "checagem_visual", "data": "YYYY-MM-DD", "item": "Nome Normalizado", "confirmado_presente": true}
```

Campo que não deu pra ler na nota vai como `null` — nunca chute um valor.
Pode acrescentar `"obs": "preço ilegível na nota"` quando útil.

---

## 4. Registrar uma compra (o caminho quente)

Chamado pela skill `captura-nota-fiscal` depois que o usuário confirmou.

1. Ache a pasta e o arquivo (2.1, 2.2) e leia (2.3). Se o arquivo não
   existe, é a primeira vez: parta de conteúdo vazio, sem cerimônia.
2. Para cada item confirmado: normalize o nome (Title Case) e classifique
   a categoria pela tabela da seção 5.
3. Monte as linhas novas e grave o arquivo inteiro (antigo + novas), via
   2.4.
4. Responda curto: quantos itens entraram, o total da nota, e onde salvou.
   Se algum item ficou com campo `null`, cite em uma linha só.

**Se o usuário disser "registra" / "pode salvar" / "manda ver", registre
tudo na hora** — inclusive os itens que ficaram ilegíveis (com `null` +
`obs`). Não pare pra pedir confirmação de novo, não faça pergunta nova.
Ele já decidiu. Cite as pendências depois de salvar, não antes.

**Não gere dashboard, não recalcule estoque, não faça análise depois de
registrar** — só se o usuário pedir.

---

## 5. Categorias e duração de estoque

Portado do backend real do app Listinia (`categorizer.py`, `config.py`) —
não invente outra taxonomia. Compare o nome do produto em minúsculo com as
keywords, na ordem da tabela; a primeira que bater vence; nada bateu =
`outros`.

| Categoria | Dias | Keywords |
|---|---|---|
| carnes & aves | 7 | bife, carne, frango, alcatra, patinho, picanha, costela, linguiça, salsicha, bacon, presunto, coxão, contrafilé, sobrecoxa, coxa, asa, peru, cordeiro, porco, suíno |
| hortifrúti | 5 | tomate, alface, cebola, alho, cenoura, batata, beterraba, abobrinha, berinjela, pimentão, brócolis, couve, espinafre, pepino, milho, mandioca, repolho, rúcula, banana, maçã, laranja, limão, abacaxi, manga, melão, melancia, uva, pera, morango, mamão, coco, abacate + demais frutas/verduras/legumes |
| laticínios | 10 | leite, queijo, iogurte, manteiga, creme de leite, requeijão, nata, coalhada, minas, prato, muçarela, catupiry, cottage, parmesão, ricota, danone, activia |
| padaria | 5 | pão, baguete, bisnaga, croissant, bolo, torta, rosca, broa, pão de queijo, tapioca, torrada, ciabatta |
| congelados | 30 | congelado, nugget, empanado, lasanha, pizza, filé de peixe, camarão, lula, sorvete, açaí, polpa de fruta |
| bebidas | 14 | água, suco, refrigerante, cerveja, vinho, energético, isotônico, chá, café, achocolatado, coca, guaraná |
| mercearia | 30 | arroz, feijão, macarrão, massa, farinha, açúcar, sal, óleo, azeite, vinagre, molho, ketchup, maionese, mostarda, tempero, caldo, atum, sardinha, milho verde, ervilha, palmito, azeitona, geleia, mel, aveia, granola, cereal, lentilha, grão de bico, amendoim, quinoa |
| biscoitos & salgadinhos | 21 | biscoito, bolacha, salgadinho, chips, wafer, cream cracker |
| limpeza | 45 | sabão, detergente, amaciante, água sanitária, alvejante, desinfetante, multiuso, esponja, lã de aço, papel toalha, rodo, vassoura, saco de lixo, inseticida, repelente |
| higiene & perfumaria | 45 | shampoo, condicionador, sabonete, creme dental, fio dental, enxaguante, escova de dente, desodorante, absorvente, hidratante, protetor solar, papel higiênico, algodão, cotonete |
| pet | 30 | ração, petisco, areia para gato, coleira, vermífugo, antipulgas |
| outros | 14 | fallback |

**Farmácia** (nicho separado, não misture com supermercado): medicamentos
(comprimido, cápsula, xarope, pomada, colírio, dipirona, ibuprofeno,
paracetamol, antibiótico) · vitaminas & suplementos (vitamina, suplemento,
ômega, probiótico, whey, colágeno, magnésio, zinco) · primeiros socorros
(curativo, band-aid, micropore, atadura, gaze, seringa, termômetro, álcool
gel) · higiene médica (soro, fralda, lenço umedecido) · outros (farmácia).

Se o usuário customizou uma duração em `config-habitos.json`, o valor dele
vence o da tabela. Frequência de compra padrão: `frequencia_dias = 7`.

---

## 6. Sem Google Drive nesta sessão

Se as ferramentas do Drive não existirem:

1. Pergunte uma vez se ele tem o `despensa.jsonl` de uma conversa anterior
   pra anexar. Se anexar, use como ponto de partida.
2. Trabalhe normalmente e, ao final, entregue o arquivo atualizado com
   `SendUserFile`, avisando que ele precisa guardar e reanexar na próxima
   conversa.
3. Ofereça, em uma linha, conectar o Google Drive pra isso ficar
   automático — sem insistir e sem bloquear o uso.

Nunca prossiga fingindo que salvou quando não salvou.

---

## 7. Calcular o estado atual (só quando pedido)

Rode **sempre por código** (Python lendo o JSONL linha a linha), nunca de
cabeça. Agrupando por nome normalizado exato:

1. **Qtd Atual** = soma das `qtd` dos eventos `compra` do item **desde o
   último** `ajuste`/`checagem_visual` (que sobrescreve o acumulado até
   ali: `qtd_atual_nova`, ou `0` se `confirmado_ausente`). Depois desse
   ponto, volta a somar as compras seguintes.
2. **Consumo Médio** = `qtd` da compra mais recente do item.
3. **Última Compra** = data da compra mais recente.

```
dias_totais    = max(1, round((qtd_atual / consumo_medio) * duracao_categoria))
previsao_fim   = ultima_compra + dias_totais dias
dias_restantes = max(0, (previsao_fim - hoje).dias)
```

**Status**: `crítico` < 25% da duração da categoria · `baixo` 25–60% ·
`ok` acima de 60%.

### ⚠️ TRAVA — nunca some quantidade "de cabeça" ou por semelhança de nome

Se duas compras do mesmo item em **datas diferentes** forem somadas
errado, ou se dois itens **parecidos mas diferentes** forem fundidos, o
estoque sai errado e contamina lista de compras e dashboard.

1. **Calcule por código, nunca mentalmente** — mesmo com poucos itens. É
   exatamente aí que o erro entre datas acontece.
2. **Agrupe por nome normalizado EXATO**, não por "parece o mesmo
   produto". "Leite Integral 1L" e "Leite Desnatado 1L" são itens
   DIFERENTES. A normalização de nome acontece **uma vez, na hora de
   registrar a compra**, com confirmação do usuário — nunca depois.
3. **A soma só existe aqui, neste algoritmo.** Nenhuma outra skill pode
   recalcular ou "ajustar" — elas só leem o resultado.

---

## 8. Ajuste manual

"já usei metade do arroz", "tira o detergente da despensa" →
acrescente um evento `ajuste` com a nova quantidade (`0` se removido) e
grave. Não apague linha nenhuma.

---

## 9. Exportar XLSX (só quando pedido)

Calcule o estado atual (seção 7) e gere um `.xlsx` com duas abas —
**Compras** (todas as linhas `compra` do JSONL) e **Despensa** (estado
atual, uma linha por item). Entregue com `SendUserFile`, seguindo a skill
`xlsx`. Deixe claro que a planilha é uma fotografia do momento: a fonte de
verdade continua sendo o `despensa.jsonl`.
