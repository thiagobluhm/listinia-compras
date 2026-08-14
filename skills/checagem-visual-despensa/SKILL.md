---
name: checagem-visual-despensa
description: Recognizes food and grocery items visible in photos of the fridge (geladeira) and pantry (despensa/armário) shelves, cross-references them against the pantry spreadsheet's recent purchase history to see what's confirmed still in stock versus what has likely run out, and asks the user to confirm before changing anything. Use ONLY as part of generating a shopping list (skill `gerador-lista-compras`), when the user attaches or offers photos of their geladeira/despensa while asking for the list — never as a standalone, always-on check, and never uninvited.
---

# Checagem Visual da Despensa (fotos da geladeira/despensa)

## Quando ativar

**Só dentro do fluxo de gerar lista de compras** — quando o usuário pedir
para gerar a lista (skill `gerador-lista-compras`) e anexar fotos da
geladeira e/ou da despensa/armário, ou aceitar quando você oferecer essa
opção. Nunca peça fotos fora desse contexto, nunca rode isso
periodicamente ou sem o usuário estar ativamente pedindo a lista.

## Passo a passo

1. **Receba as fotos.** Pode ser uma foto da geladeira aberta e outra da
   despensa/armário — quantas o usuário quiser mandar.

2. **Identifique os itens visíveis em cada foto.** Você lê imagens
   nativamente, sem precisar de OCR externo. Liste o que reconhecer com
   confiança (ex.: "Leite Integral", "Ovos", "Detergente", "Arroz").
   Não force reconhecimento de itens pouco claros — se não tem certeza,
   não liste.

3. **Carregue a despensa real** (skill `despensa-dados` — a partir do
   `despensa.jsonl` real e persistente, nunca do zero) e compare item a
   item:
   - Está na despensa **e** aparece claramente na foto → confirmado em
     estoque.
   - Está na despensa com Dias Restantes baixo/zerado **e não aparece**
     na foto → candidato a "já acabou" — mas isso é só uma sugestão, não
     uma conclusão.
   - Aparece na foto mas não está registrado na despensa (compra fora do
     fluxo de nota fiscal, por exemplo) → pode oferecer para adicionar.

4. **Apresente um resumo curto para o usuário confirmar**, por exemplo:
   ```
   Pela foto, ainda tem: leite, ovos, queijo.
   Não vi na geladeira/despensa: arroz, detergente — já acabaram?
   ```
   Pergunte direto (pode ser sim/não em bloco). Nunca decida sozinho.

5. **Só depois da confirmação do usuário**, acrescente eventos
   `checagem_visual` ao `despensa.jsonl` (skill `despensa-dados`) para os
   itens confirmados como acabados ou confirmados como presentes.
   Reconhecimento visual erra — produto escondido atrás de outro,
   embalagem parecida, foto com pouca luz — por isso a confirmação do
   usuário é obrigatória antes de gravar qualquer coisa.

6. **Com a despensa atualizada, siga normalmente para a skill
   `gerador-lista-compras`** — agora a lista sai baseada numa foto real do
   que tem em casa, não só na estimativa por dias desde a última compra.

## Limitações a deixar claras para o usuário

- Reconhecimento por foto não é perfeito. Trate sempre como sugestão a
  confirmar, nunca como fato certo.
- Não invente itens que não deu para ver claramente na foto.
- Se a foto estiver ruim (escura, desfocada, parcial), diga isso e peça
  uma nova em vez de arriscar um palpite.
