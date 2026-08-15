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

**Seja curto.** Duas ou três linhas por resposta bastam.

---

## ⛔ O limite mais importante desta skill

**Existe UM método: o QR code. A foto é exceção, e é UMA olhada só.**

É terminantemente proibido:

- ❌ recortar, fatiar, dividir em seções, ampliar, girar, aumentar
  contraste, binarizar ou tratar a imagem de qualquer forma para
  "conseguir ler melhor";
- ❌ ler a nota em pedaços e juntar os pedaços;
- ❌ tentar de novo com outra abordagem depois de falhar;
- ❌ passar de **3 comandos no total** para extrair a nota.

Se não deu pra ler, **não insista: peça outra foto.** Ficar dez minutos
tentando decifrar um cupom desbotado não é persistência — é o caminho
direto pra inventar item e preço que não existem, que é o pior erro
possível neste plugin. Uma foto nova custa cinco segundos pro usuário.

---

## Passo a passo

### 1. Peça a foto do QR code (não da nota inteira)

Se o usuário ainda não anexou nada, peça assim:

> Manda uma foto do **QR code** da nota — só ele, de perto. Não precisa
> fotografar o cupom inteiro, mesmo que ele seja comprido.

Isso é verdade: com o QR code eu pego a lista completa de itens direto na
Receita, com preço exato. Cupom comprido fotografado inteiro quase nunca
dá pra ler, e é exatamente o caso em que erro acontece.

### 2. Leia o QR code — UM comando, uma vez

Rode **um único script Python** que tenta decodificar. Dentro desse mesmo
script pode tentar mais de uma biblioteca (`zxing-cpp`, `pyzbar`,
`opencv`) e a imagem inteira — mas é **um comando só**, não uma tentativa
por vez. Se faltar biblioteca, instale junto no mesmo comando
(`pip install ... --break-system-packages`).

Saiu uma URL → passo 3. Não saiu → passo 5.

### 3. Abra a página da Receita

Use as ferramentas do Playwright para abrir a URL. A página da NFC-e
carrega o conteúdo depois do load inicial, então espere ela popular antes
de extrair. Pegue estabelecimento, data, itens (quantidade, unidade,
preço) e total.

Não carregou em ~30 segundos, ou veio quase vazia? **Não tente de novo, não
tente outro caminho.** Vá pro passo 5.

### 4. Se veio da Receita, os dados são confiáveis

Normalize os nomes pra algo legível ("LEITE INTEG UHT 1L" → "Leite
Integral 1L") e siga pro passo 6.

### 5. Sem QR: UMA olhada na foto, e ponto

Olhe a imagem **como ela está**, inteira, uma única vez, e extraia o que
der pra ler com confiança. Sem recorte, sem ampliação, sem tratamento,
sem segunda olhada.

- **Deu pra ler os itens?** Siga pro passo 6, avisando em uma linha que
  leu do papel e que vale conferir os valores.
- **Não deu?** Pare aqui e diga, sem rodeio:

  > Não consegui ler essa foto — ficou desfocada / o cupom está apagado.
  > Tenta bater outra? O melhor é focar no **QR code** da nota, de perto,
  > com boa luz. Só ele já resolve.

  E encerre a tentativa. **Não tente contornar.**

### 6. Mostre e confirme — uma vez só

Tabela compacta com os itens. Marque com `?` o que ficou duvidoso, pra ele
corrigir se quiser. Uma pergunta só: "pode registrar?".

### 7. Registre e pare

Use a skill `despensa-dados`. Se ele disse "registra", "pode salvar", "ok"
ou equivalente, **registre tudo na hora**, incluindo os itens com `?` (que
entram sem o valor faltando). Não pergunte de novo.

Depois de gravar: **pare.** Sem conferência, sem recontagem, sem dashboard,
sem cálculo de estoque, sem oferecer e-mail, sem relatório do que você fez.

### 8. Feche perguntando o que vem agora

> Salvo — 12 itens, R$ 187,40, no seu Drive.
> Quer **mandar outra nota**, **gerar a lista de compras**, ou paramos por aqui?

Pediu a lista → skill `gerador-lista-compras`. Outra nota → volta ao passo
1. Encerrou → encerre, sem oferecer mais nada.

---

## Nunca invente

Preço, quantidade ou nome que você não leu com clareza **não entra
chutado**. Entra sem o valor, marcado, ou não entra. Uma despensa com
número errado estraga a lista de compras e o controle de gasto inteiro —
é melhor faltar dado do que ter dado falso.
