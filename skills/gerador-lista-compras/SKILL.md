---
name: gerador-lista-compras
description: Generates a ready-to-shop grocery list based on the pantry's real consumption history and the user's purchase cadence, mirroring the auto-list logic already proven in the Listinia app. Use when the user asks to generate a shopping list, "monta minha lista de compras", "o que eu preciso comprar", "gera minha lista", or wants a list before going to the market.
---

# Gerador de Lista de Compras

Reproduz a mesma lógica determinística + LLM usada em produção no app
Listinia (`/despensa/gerar-lista`) — não invente uma abordagem diferente.

## Passo a passo

1. **Carregue a cadência de compra do usuário.** Leia `config-habitos.json`
   na pasta de trabalho (se existir) para pegar `frequencia_dias`. Se o
   arquivo não existir, pergunte ao usuário uma vez ("de quanto em quanto
   tempo você costuma ir ao mercado?") e salve a resposta nesse arquivo
   para as próximas vezes. Default do app real, caso o usuário não saiba:
   `frequencia_dias = 7` (semanal).

2. **Leia a aba "Despensa"** de `despensa.xlsx` (skill `despensa-xlsx`).
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
