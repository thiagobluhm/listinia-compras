---
name: gerador-lista-compras
description: Generates a ready-to-shop grocery list based on the pantry's real consumption history and the user's purchase cadence, mirroring the auto-list logic already proven in the Listinia app. Use when the user asks to generate a shopping list, "monta minha lista de compras", "o que eu preciso comprar", "gera minha lista", or wants a list before going to the market.
---

# Gerador de Lista de Compras

Reproduz a mesma lógica determinística + LLM usada em produção no app
Listinia (`/despensa/gerar-lista`) — não invente uma abordagem diferente.

## Passo a passo

0. **Opcional — checagem visual.** Se o usuário anexar fotos da geladeira
   e/ou da despensa junto com o pedido da lista, ou aceitar quando você
   oferecer essa opção, use a skill `checagem-visual-despensa` primeiro
   para confirmar visualmente o que ainda tem em casa antes de calcular a
   lista. Não é obrigatório — sem fotos, siga direto pelo passo 1 usando
   só os dados da planilha.

1. **Carregue a cadência de compra do usuário.** `config-habitos.json` vive
   no mesmo lugar persistente que `despensa.xlsx` (veja a seção de
   persistência na skill `despensa-xlsx` — memória do projeto → pasta do
   dispositivo → pasta de trabalho da sessão como último recurso). Leia de
   lá para pegar `frequencia_dias`. Se o arquivo não existir, pergunte ao
   usuário uma vez ("de quanto em quanto tempo você costuma ir ao
   mercado?") e salve a resposta no mesmo lugar persistente. Default do
   app real, caso o usuário não saiba: `frequencia_dias = 7` (semanal).

2. **Leia a aba "Despensa"** de `despensa.xlsx` (skill `despensa-xlsx` —
   carregue a planilha real, nunca uma nova).
   Um item é candidato se `Dias Restantes <= frequencia_dias` — ou seja,
   vai acabar antes da próxima ida ao mercado.

3. **Calcule a quantidade sugerida** para cada candidato:
   ```
   quantidade_sugerida = max(1, round(consumo_medio * (frequencia_dias / duracao_categoria) - qtd_atual, 1))
   ```

4. **Classifique a urgência** (mesmos limiares do app real):
   - `crítica` se dias_restantes <= 1
   - `alta` se dias_restantes <= frequencia_dias * 0.4
   - `normal` caso contrário

5. **Normalize e deduplique** os nomes dos itens (produtos com nomes
   parecidos = o mesmo produto — use o nome mais legível). Ordene por
   urgência (crítica → alta → normal).

6. **Apresente a lista** como checklist, agrupada por urgência, com
   quantidade e unidade. Pergunte se o usuário quer exportar como XLSX
   (mesma pasta, arquivo `lista-de-compras.xlsx` — siga a skill `xlsx`).

7. **Se o usuário quiser preço estimado e o melhor mercado por item**,
   chame a skill `pesquisa-encartes-mercado` passando esta lista — ela
   cruza os itens com as ofertas pesquisadas e devolve a lista com valor
   provável.

8. **Se a despensa estiver bem abastecida** (nenhum candidato), diga isso
   claramente em vez de forçar uma lista vazia ou inventar itens.
