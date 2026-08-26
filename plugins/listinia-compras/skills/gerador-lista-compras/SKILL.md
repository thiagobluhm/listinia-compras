---
name: gerador-lista-compras
description: Generates a ready-to-shop grocery list based on the pantry's real consumption history and the user's purchase cadence, mirroring the auto-list logic already proven in the Listinia app. Use when the user asks to generate a shopping list, "monta minha lista de compras", "o que eu preciso comprar", "gera minha lista", or wants a list before going to the market.
---

# Gerador de Lista de Compras

Delegue ao agente **`listinia-orquestrador`** (ferramenta `Agent`). Ele
aciona o `listinia-listador`, que reproduz a lógica determinística já
validada em produção no app Listinia (`/despensa/gerar-lista`).

## A missão

- o pedido da pessoa, nas palavras dela;
- **os caminhos das fotos** de geladeira/despensa, se ela anexou alguma;
- a cadência de ida ao mercado, se ela já disse. Se não, o padrão é 7 dias
  — pergunte uma vez, sem insistir.

## O que o orquestrador tem que garantir

1. **Fotos, se houver.** Vieram fotos anexadas → `listinia-leitor-visual`
   antes de tudo. Não vieram → ofereça **uma vez**, em uma frase:

   > Quer mandar uma foto da geladeira e/ou da despensa pra eu conferir o
   > que realmente ainda tem em casa? Não precisa — se preferir, eu sigo só
   > com o histórico.

   Recusou → siga direto pelo histórico, sem oferecer de novo.

2. **Confirmação antes de mudar qualquer coisa.** O que a foto sugere que
   acabou é **sugestão**, nunca conclusão — reconhecimento visual erra
   (produto atrás de outro, embalagem parecida, pouca luz). Pergunte em
   bloco, e só depois mande o `listinia-despensor` atualizar.

3. **Só então a lista.** `listinia-listador` sobre o estado real.

4. **Preço, se ela quiser.** `listinia-navegador` no modo encartes, com a
   lista pronta em mãos.

5. **Despensa abastecida é uma resposta válida.** Nenhum candidato → diga
   isso. Não force uma lista para parecer útil.

## 🚫 JAMAIS INVENTAR

- A lista sai do estado real do servidor. Nunca inclua item que não está na
  despensa porque "todo mundo compra".
- Sem histórico suficiente, a resposta é "ainda não dá para montar" — não
  uma lista genérica de supermercado.
- Item sem consumo médio registrado entra sem quantidade sugerida, com a
  ressalva — não com um número chutado.
- Conta é por código, nunca de cabeça. Dias restantes e status vêm prontos
  do servidor.

## 🗣️ Como falar

Nada de nome de ferramenta, de agente, de arquivo ou de código na resposta.
"Sua lista", "sua despensa". Duas ou três linhas. A lista final é um
checklist agrupado por urgência, com quantidade e unidade — e a oferta de
exportar em planilha, se ela quiser.
