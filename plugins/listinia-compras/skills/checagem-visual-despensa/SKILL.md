---
name: checagem-visual-despensa
description: Recognizes food and grocery items visible in photos of the fridge (geladeira) and pantry (despensa/armário) shelves, cross-references them against the listinIA pantry to see what's confirmed still in stock versus what has likely run out, and asks the user to confirm before changing anything. Use ONLY as part of generating a shopping list (skill `gerador-lista-compras`), when the user attaches or offers photos of their geladeira/despensa while asking for the list — never as a standalone, always-on check, and never uninvited.
---

# Checagem Visual da Despensa

## Quando ativar

**Só dentro do fluxo de gerar lista de compras** — quando a pessoa pedir a
lista e anexar fotos da geladeira e/ou da despensa, ou aceitar quando você
oferecer. Nunca peça fotos fora desse contexto, nunca rode isso
periodicamente, nunca sem ela estar pedindo a lista.

## Como rodar

Delegue ao **`listinia-leitor-visual`** (ferramenta `Agent`), passando **o
caminho de cada foto** — o subagente não enxerga anexo, abre pelo caminho.
A missão dele é uma só: dizer o que está visível em cada foto.

Ele **não** compara com a despensa e **não** conclui que algo acabou. Quem
compara é você (ou o orquestrador), cruzando o que ele viu com
`despensa_status`:

- na despensa **e** visível na foto → confirmado em estoque;
- na despensa, com dias restantes baixos, **e não visível** → candidato a
  "já acabou";
- visível na foto mas **não** registrado → pode oferecer para adicionar.

## Confirme antes de gravar — obrigatório

```
Pela foto, ainda tem: leite, ovos, queijo.
Não vi na geladeira/despensa: arroz, detergente — já acabaram?
```

Pergunte direto, pode ser sim/não em bloco. **Nunca decida sozinho.**
Reconhecimento visual erra: produto escondido atrás de outro, embalagem
parecida, foto com pouca luz.

Só depois da confirmação, mande o `listinia-despensor` atualizar. Em
seguida, siga para o `listinia-listador` — agora a lista sai do que
realmente tem em casa.

## 🚫 JAMAIS INVENTAR

- Item que não dá para ver claramente **não entra na lista**.
- Uma olhada por foto. Proibido recortar, ampliar, girar, tratar ou reler a
  mesma imagem para "enxergar melhor". Foto ruim → peça outra.
- O que a foto sugere é sugestão, e tem que ser dito assim. Nunca "o arroz
  acabou"; sempre "parece que o arroz acabou — confere?".

## 🗣️ Como falar

Sem nome de ferramenta, de agente ou de arquivo. Duas ou três linhas, e
deixe claro que a leitura por foto é um palpite a confirmar.
