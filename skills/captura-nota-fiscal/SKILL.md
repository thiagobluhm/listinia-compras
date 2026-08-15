---
name: captura-nota-fiscal
description: Captures a Brazilian grocery or pharmacy receipt (nota fiscal / NFC-e) by decoding its QR code and fetching the official SEFAZ page via Playwright, with a single-look photo reading as fallback. Use when the user says things like "captura essa nota", "lê essa nota fiscal", "escaneia esse cupom", "processa essa nota de compra", "joga essa nota na despensa", or attaches a photo/PDF of a supermarket or pharmacy receipt.
---

# Captura de Nota Fiscal

## 🗣️ Como falar (regra que vale para tudo abaixo)

Quem usa este plugin é uma pessoa comum organizando as compras de casa —
não um programador. A conversa tem que parecer um assistente prestativo,
nunca um terminal.

**Nunca escreva na resposta:** nome de ferramenta, ID de arquivo, trecho de
código, JSON, nome técnico de arquivo, ou explicação de como você funciona
por dentro.

**Se der problema:** resolva sozinho ou diga em UMA frase simples o que
houve e o que fazer. Nunca peça código ou ID, nunca ofereça opções
técnicas, nunca liste ferramentas.

**Seja curto.** Fora as três perguntas obrigatórias da seção seguinte, duas
ou três linhas por resposta bastam.

---

## ✅ Progresso visível — obrigatório

Assim que a captura começar, crie uma lista de etapas (ferramenta de
tarefas) com os passos previstos ("Ler nota", "Conferir itens",
"Registrar ou entregar") e marque cada uma como concluída assim que
terminar. Isso substitui narrar cada passo em texto — o usuário acompanha
pela lista, não por parágrafo.

---

## ⛔ O limite mais importante desta skill

**Existe UM método pra ler o papel: o QR code. A foto é exceção, e é UMA
olhada só.**

É terminantemente proibido:

- ❌ recortar, fatiar, dividir em seções, ampliar, girar, aumentar
  contraste, binarizar ou tratar a imagem de qualquer forma para
  "conseguir ler melhor";
- ❌ ler a nota em pedaços e juntar os pedaços;
- ❌ tentar de novo com outra abordagem depois de falhar;
- ❌ passar de **3 comandos no total** para extrair a nota;
- ❌ **montar a URL da nota "na mão" a partir da chave de acesso, ou usar
  busca/`web_fetch`/qualquer outra ferramenta pra tentar consultar a nota
  por fora do Playwright.** Isso não é um "caminho alternativo válido" —
  é exatamente o "tentar de novo com outra abordagem" proibido acima, só
  que disfarçado. A Receita só é confiável pela página oficial carregada
  via Playwright; qualquer outro jeito de "adivinhar" o conteúdo é o
  mesmo risco de inventar dado que a foto picotada.

Se não deu pra ler — **de qualquer forma que seja: QR ilegível, página não
carregou, ou a própria ferramenta do Playwright não estava disponível
nesta sessão** — **não insista: peça outra foto.** Ficar dez minutos
tentando decifrar um cupom desbotado, ou inventando um jeito alternativo
de bater na Receita, não é persistência — é o caminho direto pra inventar
item e preço que não existem, que é o pior erro possível neste plugin.
Uma foto nova custa cinco segundos pro usuário.

---

## ❗ Três perguntas obrigatórias — regra absoluta, nunca pule

Diferente do resto do plugin (que evita ficar perguntando), estas três
perguntas são **mandatórias**, mesmo que pareçam repetir algo óbvio. Cada
uma tem seu ponto certo no fluxo — não antecipe nem misture.

### Pergunta 1 — método, sempre no início

Antes de tentar ler qualquer coisa, **sempre pergunte**, mesmo que já
tenha vindo uma foto anexada (o cupom inteiro costuma trazer o QR code
junto, no rodapé — por isso a escolha importa mesmo com a foto em mãos):

> Quer que eu leia pelo **QR code** da nota (mais rápido e exato) ou pela
> **foto do cupom**?

Só pule esta pergunta se o próprio usuário já disse na mesma mensagem qual
caminho quer (ex.: "lê o QR code dessa nota").

- Escolheu QR code → vá para a leitura do QR (regra dos 3 comandos,
  abaixo). Se não achar QR legível, **não caia para a leitura de foto
  sozinho** — avise que não achou o QR e pergunte se quer tentar pela foto
  do cupom ou mandar uma foto melhor do QR.
- Escolheu foto/cupom → vá direto para "Sem QR: uma olhada na foto".

### Pergunta 2 — itens ilegíveis, assim que aparecerem

Se sobrar item que você não conseguiu ler com confiança (nome, quantidade
ou preço), **pare aí** — não monte uma lista com `?` e siga sozinho até o
fim. Pergunte:

> Não consegui ler [X itens / o valor de tal item] — quer completar lendo
> na nota, ou eu sigo sem esses itens?

Espere a resposta antes de seguir. Se o usuário completar, use o valor que
ele der. Se disser pra seguir sem eles, remova esses itens da lista — não
os leve adiante como `null`.

### Pergunta 3 — registrar ou só entregar, na confirmação final

Depois que a lista de itens estiver fechada (completa, ou já sem os itens
descartados na pergunta 2), pergunte:

> Quer que eu **registre isso na sua despensa**, ou prefere só que eu
> **te entregue a nota organizada**, sem salvar nada?

- Registrar → siga para o passo de registro, usando a skill
  `despensa-dados`.
- Só entregar → monte a tabela final e entregue (mensagem ou arquivo, o
  que fizer mais sentido), sem gravar nada na despensa. Não pergunte de
  novo depois disso.

---

## Passo a passo

### 1. Pergunta 1 (método) — ver seção acima

### 2. Leia o QR code — UM comando, uma vez

Rode **um único script Python** que tenta decodificar. Dentro desse mesmo
script pode tentar mais de uma biblioteca (`zxing-cpp`, `pyzbar`,
`opencv`) e a imagem inteira — mas é **um comando só**, não uma tentativa
por vez. Se faltar biblioteca, instale junto no mesmo comando
(`pip install ... --break-system-packages`).

Saiu uma URL → passo 3. Não saiu → veja a ramificação da Pergunta 1
(avisar e perguntar, nunca cair sozinho pra foto).

### 3. Abra a página da Receita

Use as ferramentas do Playwright para abrir a URL. A página da NFC-e
carrega o conteúdo depois do load inicial, então espere ela popular antes
de extrair. Pegue estabelecimento, data, itens (quantidade, unidade,
preço) e total.

**As ferramentas do Playwright nem aparecem, ou pedem conexão com
dispositivo/navegador que não existe nesta sessão?** Trate isso do mesmo
jeito que "não carregou" — não é um problema pra contornar com outra
ferramenta, é o sinal de parar. Nunca tente `web_fetch`, busca na web, ou
montar a URL manualmente como substituto — isso está proibido acima.

Não carregou em ~30 segundos, veio quase vazia, ou a ferramenta não estava
disponível? **Não tente de novo, não tente outro caminho.** Avise e
pergunte se quer tentar pela foto do cupom (deixando claro, se for o
caso, que a foto que ele já mandou pode ser só parte do cupom — pergunte
se aquela foto é a nota inteira antes de assumir que sim).

### 4. Se veio da Receita, os dados são confiáveis

Normalize os nomes pra algo legível ("LEITE INTEG UHT 1L" → "Leite
Integral 1L"). Se algum item ainda ficou ambíguo mesmo vindo da Receita,
use a Pergunta 2. Senão, siga para a Pergunta 3.

### 5. Sem QR (ou usuário escolheu foto): uma olhada, e ponto

Olhe a imagem **como ela está**, inteira, uma única vez, e extraia o que
der pra ler com confiança. Sem recorte, sem ampliação, sem tratamento,
sem segunda olhada.

Antes de seguir, confira se a foto parece ser o cupom **inteiro**: se a
numeração dos itens não começa em 001, ou o valor total não bate com a
soma dos itens visíveis, é sinal de que a foto é só um pedaço do papel.
Nesse caso trate como "não deu pra ler direito" (abaixo) — não registre
uma fração da compra como se fosse a nota completa.

- **Deu pra ler os itens?** Aplique a Pergunta 2 para o que sobrar
  ilegível, avisando em uma linha que leu do papel e que vale conferir os
  valores. Depois siga para a Pergunta 3.
- **Não deu ler quase nada?** Pare aqui e diga, sem rodeio:

  > Não consegui ler essa foto — ficou desfocada / o cupom está apagado.
  > Tenta bater outra? O melhor é focar no **QR code** da nota, de perto,
  > com boa luz. Só ele já resolve.

  E encerre a tentativa. **Não tente contornar.**

### 6. Mostre a lista final

Tabela compacta com os itens já resolvidos (sem `?` pendente — a Pergunta
2 já cuidou disso). Aplique a Pergunta 3 antes de fazer qualquer coisa com
os dados.

### 7. Registre (se foi essa a escolha) e pare

Use a skill `despensa-dados`. Registre tudo na hora, sem perguntar de
novo — a decisão já foi tomada na Pergunta 3.

Depois de gravar: **pare.** Sem conferência, sem recontagem, sem dashboard,
sem cálculo de estoque, sem oferecer e-mail, sem relatório do que você fez.

### 8. Feche perguntando o que vem agora

> Salvo — 12 itens, R$ 187,40, no seu Drive.
> Quer **mandar outra nota**, **gerar a lista de compras**, ou paramos por aqui?

(Se a escolha da Pergunta 3 foi "só entregar", troque a primeira linha por
uma confirmação de que a nota foi entregue, sem mencionar despensa.)

Pediu a lista → skill `gerador-lista-compras`. Outra nota → volta ao passo
1 (Pergunta 1 de novo, é uma nota nova). Encerrou → encerre, sem oferecer
mais nada.

---

## Nunca invente

Preço, quantidade ou nome que você não leu com clareza **não entra
chutado**. Com a Pergunta 2 isso nunca deveria acontecer — mas se algum
campo escapar sem confirmação, ele entra vazio/marcado, nunca com um valor
inventado. Uma despensa com número errado estraga a lista de compras e o
controle de gasto inteiro — é melhor faltar dado do que ter dado falso.
