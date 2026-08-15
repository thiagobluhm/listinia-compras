---
name: despensa-dados
description: Manages the user's pantry (despensa) — keeps a compact current-state file (one line per product) plus write-once purchase records, computes days-of-stock-remaining per item using category shelf-life defaults, and can export the current state as an XLSX spreadsheet on demand. Use when the user asks to update the pantry, check what's running low or about to expire, adjust an item's quantity by hand, add or remove an item manually, wants a spreadsheet export, or right after a receipt has just been captured and confirmed.
---

# Gestão da Despensa

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
liste as ferramentas que você tem.

**Seja curto.** Duas ou três linhas por resposta bastam, sem relatório do
que você fez por dentro.

---

## ⏱️ A regra que manda em tudo: velocidade

Registrar uma nota tem que levar **segundos**, não minutos — e tem que
continuar levando segundos na centésima nota.

O que faz demorar não é o número de chamadas de ferramenta: é **a
quantidade de texto que você precisa escrever**. Todo conteúdo de arquivo
que você grava passa por você, palavra por palavra. Um arquivo de 20 KB
custa minutos só de digitação.

Por isso o desenho abaixo é **inegociável**:

- ❌ **Nunca** leia o histórico inteiro de compras e reescreva ele todo.
  Esse foi o erro que travava o plugin: o arquivo crescia a cada nota e o
  tempo de gravação crescia junto, até ficar inviável.
- ✅ O arquivo que você reescreve é **só o estado atual — uma linha por
  produto**. Ele estabiliza em algumas dezenas de linhas (a família compra
  sempre mais ou menos as mesmas coisas) e **para de crescer**.
- ✅ O detalhe de cada compra vai para um arquivo próprio, escrito **uma
  vez e nunca mais tocado**.

### Proibido no caminho de gravar

Nada de passos de conferência. Especificamente, **não faça**: contar
linhas, medir tamanho de arquivo, converter para base64, imprimir o
conteúdo "para conferir", reler o que acabou de montar, ou qualquer
verificação intermediária. Monte o conteúdo e grave. Só isso.

---

## 1. Onde salvar

Duas pernas podem existir ao mesmo tempo — **pasta local** (rápida, só
acessível na sessão que tem a pasta conectada) e **Google Drive**
(universal, qualquer canal — celular, web, desktop). Elas não se
comunicam sozinhas: se hoje você registra pela pasta local e amanhã pelo
celular, cada canal só vê o que foi escrito nele, a não ser que a gente
force a sincronia. É por isso que existe a seção 1.2 abaixo — **não pule
ela** quando os dois canais existirem.

### 1.0 Detecte o que esta sessão tem

- **Pasta local?** Um projeto do Cowork, uma pasta conectada, ou o Cowork
  rodando no computador do usuário. Guarde tudo em `Listinia Compras/`
  dentro dela.
- **Google Drive conectado?** Ferramentas do Drive disponíveis (carregue
  pelo nome exato — seção 5.0 — antes de concluir que não tem).

Pode ter os dois, só um, ou nenhum. O restante desta seção assume que você
já sabe quais dos dois existem aqui.

### 1.1 Só Drive, ou só pasta local → sem reconciliação, siga direto

- **Só Drive:** use o Drive normalmente (seção 5). Ele é o canal universal
  — qualquer sessão futura, em qualquer aparelho, vai enxergar o que você
  gravar aqui. Não dá pra acrescentar, só substituir o arquivo inteiro;
  por isso o formato compacto da seção 2 é obrigatório.
- **Só pasta local:** use ela (mais rápida — dá pra **acrescentar linha no
  fim do arquivo** sem reescrever nada):

  ```python
  with open(caminho, "a", encoding="utf-8") as f:
      f.write(linha_nova + "\n")
  ```

  Se o usuário perguntar se isso vai aparecer no celular depois, seja
  direto: sem Drive conectado, não — essa pasta só existe aqui.
- **Nenhum dos dois:** trabalhe normalmente e, no fim, entregue o arquivo
  da despensa com `SendUserFile`, explicando em duas linhas:

  > Não consegui salvar no seu Google Drive nesta conversa, então te mandei
  > a sua despensa aqui em cima — guarde esse arquivo e anexe na próxima vez
  > que a gente conversar, que eu continuo de onde paramos.

  Não pergunte nada, não ofereça opções: decida e siga.

### 1.2 Pasta local **e** Drive na mesma sessão → reconcilie antes de gravar

Isso é o que faz os dois canais "conversarem" entre si sem custar o ciclo
lento do Drive toda vez. Faça isso **antes** de aplicar qualquer registro
novo, uma única vez no início da operação:

1. Pegue a data de modificação do `despensa.jsonl` dos dois lados — o
   mtime do arquivo na pasta local, e o `modifiedTime` do arquivo no Drive
   (metadado só, **não baixe o conteúdo ainda** — isso é rápido).
2. Um dos dois não existe ainda → copie o que existe pro que falta e siga
   com esse conteúdo como ponto de partida.
3. Datas iguais (ou a diferença é só o próprio espelhamento de rotina) →
   a pasta local já está sincronizada; use ela como ponto de partida
   (é a mais barata de ler).
4. **Drive mais recente que a pasta local** → alguma sessão sem acesso à
   pasta (celular, por exemplo) gravou depois da última vez que essa
   pasta foi atualizada. Baixe o conteúdo do Drive, use-o como ponto de
   partida **e** grave essa mesma versão na pasta local antes de aplicar
   a nota nova — assim a pasta se atualiza e nada do que foi comprado pelo
   celular se perde.
5. **Pasta local mais recente que o Drive** → uma gravação anterior não
   conseguiu terminar o espelhamento (seção 1.3). Use a pasta local como
   ponto de partida e, ao gravar, garanta que o espelhamento rode de novo.

Depois de resolvido, siga o registro normalmente (seção 3) usando o
conteúdo escolhido como base.

### 1.3 Depois de gravar na pasta local, espelhe pro Drive em paralelo

Sempre que os dois canais existirem e você gravar na pasta local, o Drive
também precisa da atualização — senão a próxima sessão sem acesso à pasta
(celular) fica com dado velho.

**Não faça isso antes de responder ao usuário.** A ordem é:

1. Grave na pasta local (rápido) e responda ao usuário como sempre
   (seção 3, passo 4) — ele não deveria esperar o Drive pra ouvir "salvo".
2. Só depois disso, dispare o espelhamento como uma tarefa separada (um
   subagente, em paralelo) que aplica a receita da seção 5.3 no Drive com
   o conteúdo final que você acabou de gravar localmente. Não espere o
   resultado bloquear mais nada da conversa — é manutenção de
   consistência, não faz parte do que o usuário pediu.
3. Se o espelhamento falhar, **não avise o usuário nem tente de novo na
   hora** — a próxima sessão com os dois canais disponíveis vai detectar
   a divergência na seção 1.2 e resolver sozinha. Isso só vira um aviso
   pro usuário se falhar repetidamente por vários dias (aí sim, uma linha
   simples: "não consegui atualizar sua despensa no Drive nas últimas
   vezes — se estiver usando o celular, os dados podem estar
   desatualizados").

---

## 2. Os arquivos

| Arquivo | O que é | Reescrito? |
|---|---|---|
| `despensa.jsonl` | **Estado atual: uma linha por produto** | Sim, toda vez — por isso tem que ser compacto |
| `nota-AAAA-MM-DD-<mercado>.jsonl` | Detalhe item a item de uma compra | **Não. Escrito uma vez e nunca mais tocado** |
| `mercados.json` | Mercados preferidos | Raro |
| `config-habitos.json` | Frequência de compra e ajustes | Raro |
| `Listinia - Dashboard.md` | Dashboard | Só quando pedido |

### `despensa.jsonl` — uma linha por PRODUTO (não por compra)

Chaves curtas de propósito, para o arquivo ficar pequeno:

```json
{"i":"Leite Integral 1L","c":"laticínios","q":2,"u":"L","cm":2,"uc":"2026-08-15","p":5.5}
```

`i` item · `c` categoria · `q` quantidade atual · `u` unidade ·
`cm` consumo médio · `uc` data da última compra · `p` último preço unitário.

Nada além disso. Não acrescente campos "que podem ser úteis depois" — cada
campo extra multiplica o tempo de gravação em toda nota futura.

### `nota-AAAA-MM-DD-<mercado>.jsonl` — o detalhe da compra

Uma linha por item comprado, escrita uma única vez:

```json
{"data":"2026-08-15","mercado":"Mercadinho X","item":"Leite Integral 1L","categoria":"laticínios","qtd":2,"unidade":"L","preco_unitario":5.5,"preco_total":11.0}
```

Campo ilegível na nota vai como `null` — nunca chute um valor.

Esses arquivos são o histórico completo: se algum dia o estado atual ficar
estranho, dá pra reconstruir tudo a partir deles.

---

## 3. Registrar uma compra (o caminho quente)

Chamado pela `captura-nota-fiscal` depois que o usuário confirmou.

1. Se os dois canais (pasta local + Drive) existirem nesta sessão, resolva
   a reconciliação da seção 1.2 **primeiro** — o ponto de partida do passo
   2 é o resultado dela, não uma leitura direta e cega de um dos lados.
   Só um canal? Carregue o `despensa.jsonl` dele normalmente (é pequeno).
   Não existe ainda? Comece vazio, sem cerimônia.
2. **Em um único script Python**, aplique a nota sobre o estado:
   - Para cada item: normalize o nome (Title Case) e classifique a
     categoria pela tabela da seção 4.
   - Produto já existe no estado (nome normalizado **exato**) →
     `q = q + qtd_comprada`, `cm = qtd_comprada`, `uc = data da nota`,
     `p = preço unitário`.
   - Produto novo → acrescente a linha.
3. Grave o `despensa.jsonl` novo (no canal principal desta sessão — seção
   1.1) e, separadamente, o arquivo de detalhe daquela nota.
4. Responda em duas linhas: quantos itens entraram, o total da nota, onde
   salvou. Se algum campo ficou ilegível, cite em uma linha depois.
5. Só então, se os dois canais existirem, dispare o espelhamento da seção
   1.3 — depois de já ter respondido, nunca antes.

**Quando chamada pela `captura-nota-fiscal`, a confirmação já aconteceu
antes de chegar aqui** — aquela skill pergunta obrigatoriamente se o
usuário quer registrar, e resolve todo item ilegível com o usuário antes
de te passar a lista. Por isso: **registre tudo na hora**, sem perguntar
de novo e sem esperar item com `?` pendente — se algum ainda chegar
incompleto, é porque o usuário decidiu seguir sem aquele dado, então grave
como está (nunca invente o valor faltante).

Se você for chamada fora desse fluxo (ajuste manual, por exemplo) e o
usuário disser "registra" / "pode salvar" / "manda ver", vale a mesma
regra: registre na hora, não pergunte de novo.

**Depois de registrar, pare.** Não gere dashboard, não calcule dias
restantes, não faça análise, não ofereça enviar por e-mail. Só se pedirem.

### ⚠️ TRAVA — nunca some "de cabeça" nem por nome parecido

1. **A conta é sempre por código** (o script do passo 2), nunca mental,
   nem com poucos itens. É exatamente aí que erro entre datas acontece.
2. **Casamento por nome normalizado EXATO.** "Leite Integral 1L" e "Leite
   Desnatado 1L" são produtos DIFERENTES. Juntar dois nomes parecidos só
   acontece **uma vez, na hora de registrar**, com o usuário confirmando —
   nunca depois.
3. **Só este passo altera quantidade.** Nenhuma outra skill recalcula ou
   "ajusta" — elas apenas leem o estado.

---

## 4. Categorias e duração de estoque

Portado do backend real do app Listinia (`categorizer.py`, `config.py`).
Compare o nome do produto em minúsculo com as keywords, na ordem da
tabela; a primeira que bater vence; nada bateu = `outros`.

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

**Farmácia** (nicho separado): medicamentos (comprimido, cápsula, xarope,
pomada, colírio, dipirona, ibuprofeno, paracetamol, antibiótico) ·
vitaminas & suplementos (vitamina, suplemento, ômega, probiótico, whey,
colágeno, magnésio, zinco) · primeiros socorros (curativo, band-aid,
micropore, atadura, gaze, seringa, termômetro, álcool gel) · higiene
médica (soro, fralda, lenço umedecido) · outros (farmácia).

Duração customizada pelo usuário em `config-habitos.json` vence a tabela.
Frequência de compra padrão: 7 dias.

---

## 5. Receita do Google Drive (testada)

### 5.0 Antes de tudo: carregue as ferramentas pelo nome exato

As ferramentas do Drive podem estar adormecidas — aí **não aparecem** numa
busca por palavra-chave, mesmo existindo. Carregue-as de uma vez:

```
ToolSearch: query = "select:mcp__Google_Drive__search_files,mcp__Google_Drive__create_file,mcp__Google_Drive__download_file_content,mcp__Google_Drive__trash_file"
```

**Só conclua que "não tem Google Drive" se ESSA chamada não trouxer as
ferramentas.** Nunca a partir de uma lista parcial.

### 5.1 Achar (ou criar) a pasta

```
search_files: query = "title = 'Listinia Compras' and mimeType = 'application/vnd.google-apps.folder'", excludeContentSnippets = true
```

Não achou → `create_file` com `title = "Listinia Compras"` e
`contentMimeType = "application/vnd.google-apps.folder"`.

### 5.2 Achar e ler um arquivo

```
search_files: query = "parentId = '<PASTA_ID>' and title = 'despensa.jsonl'", excludeContentSnippets = true
download_file_content: fileId = "<id>"
```

Volta em base64 — decodifique. Voltou mais de um arquivo? Use o de
`createdTime` mais recente e mande os outros pro lixo.

### 5.3 Gravar

Criar o novo primeiro, descartar o antigo depois (se falhar, o antigo
continua intacto):

```
create_file:
  title = "despensa.jsonl"
  parentId = "<PASTA_ID>"
  contentMimeType = "text/plain"
  disableConversionToGoogleType = true      ← OBRIGATÓRIO
  textContent = "<estado novo completo>"

trash_file: fileId = "<id do antigo>"
```

Arquivo de detalhe de nota é só o `create_file` — não existe antigo pra
descartar.

### ⚠️ Três erros que travam tudo

1. **`update_file` não grava conteúdo** — só renomeia ou move.
2. **Sem `disableConversionToGoogleType = true`** o Drive converte o
   arquivo em Google Doc e a leitura seguinte volta corrompida.
3. **Não use `trashed` na query** — esse termo não existe e quebra a
   busca. Arquivo no lixo já não aparece nos resultados.

`read_file_content` não serve para esses arquivos — use
`download_file_content`.

O identificador do arquivo muda a cada gravação: sempre reache por pasta +
nome, nunca guarde de uma conversa pra outra.

---

## 6. Dias restantes e status (só quando pedido)

Sempre por código, a partir do estado atual:

```
dias_totais    = max(1, round((q / cm) * duracao_categoria))
previsao_fim   = uc + dias_totais dias
dias_restantes = max(0, (previsao_fim - hoje).dias)
```

**Status**: `crítico` < 25% da duração da categoria · `baixo` 25–60% ·
`ok` acima de 60%.

---

## 7. Ajuste manual

"já usei metade do arroz", "tira o detergente da despensa" → altere o `q`
daquele produto no estado (ou remova a linha) e grave. Sem cerimônia.

---

## 8. Exportar XLSX (só quando pedido)

Gere um `.xlsx` com o estado atual (uma linha por produto, com dias
restantes e status) e entregue via `SendUserFile`, seguindo a skill `xlsx`.
Se o usuário quiser o histórico de compras junto, aí sim leia os arquivos
de detalhe das notas. Deixe claro que a planilha é uma fotografia do
momento.
