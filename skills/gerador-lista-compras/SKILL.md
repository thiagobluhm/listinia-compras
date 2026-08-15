---
name: gerador-lista-compras
description: Generates a ready-to-shop grocery list based on the pantry's real consumption history and the user's purchase cadence, mirroring the auto-list logic already proven in the Listinia app. Use when the user asks to generate a shopping list, "monta minha lista de compras", "o que eu preciso comprar", "gera minha lista", or wants a list before going to the market.
---

# Gerador de Lista de Compras

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
liste as ferramentas que você tem. Ele não tem como responder isso e só
vai se sentir perdido.

**Seja curto.** Duas ou três linhas por resposta bastam, sem relatório do
que você fez por dentro.

Reproduz a mesma lógica determinística + LLM usada em produção no app
Listinia (`/despensa/gerar-lista`) — não invente uma abordagem diferente.

## Passo a passo

0. **Opcional — checagem visual.** Se o usuário anexar fotos da geladeira
   e/ou da despensa junto com o pedido da lista, ou aceitar quando você
   oferecer essa opção, use a skill `checagem-visual-despensa` primeiro
   para confirmar visualmente o que ainda tem em casa antes de calcular a
   lista. Não é obrigatório — sem fotos, siga direto pelo passo 1 usando
   só os dados da planilha.

1. **Carregue a cadência de compra do usuário.** `config-habitos.json`
   fica no mesmo lugar dos outros dados do plugin — use a skill
   `despensa-dados` (seção "Receita do Google Drive") para ler e gravar.
   Pegue de lá o `frequencia_dias`. Se o arquivo não existir, pergunte
   uma vez ("de quanto em quanto tempo você costuma ir ao mercado?") e
   salve a resposta no mesmo lugar persistente. Default do app real, caso
   o usuário não saiba: `frequencia_dias = 7` (semanal).

2. **Carregue o estado atual da despensa** (skill `despensa-dados` — a
   partir do `despensa.jsonl` real, nunca do zero). Um item é candidato se
   `Dias Restantes <= frequencia_dias` — ou seja, vai acabar antes da
   próxima ida ao mercado.

3. **Calcule a quantidade sugerida por código** (Python, nunca de cabeça —
   mesma regra da `⚠️ TRAVA` na skill `despensa-dados`), para cada
   candidato:
   ```
   quantidade_sugerida = max(1, round(consumo_medio * (frequencia_dias / duracao_categoria) - qtd_atual, 1))
   ```

4. **Classifique a urgência** (mesmos limiares do app real):
   - `crítica` se dias_restantes <= 1
   - `alta` se dias_restantes <= frequencia_dias * 0.4
   - `normal` caso contrário

5. **Ordene por urgência** (crítica → alta → normal). **Não deduplique
   nem funda itens por nome parecido aqui** — cada item já veio como uma
   linha única e distinta do `despensa-dados` (a normalização/deduplicação
   de nome acontece só uma vez, no momento da compra). Nesta etapa você só
   formata e ordena para exibição — nunca some, funda ou recalcule
   quantidade de dois itens diferentes por acharem parecidos.

6. **Apresente a lista** como checklist, agrupada por urgência, com
   quantidade e unidade. Pergunte se o usuário quer exportar como XLSX
   (`lista-de-compras.xlsx`, entregue via `SendUserFile` — siga a skill
   `xlsx`).

7. **Se o usuário quiser preço estimado e o melhor mercado por item**,
   chame a skill `pesquisa-encartes-mercado` passando esta lista — ela
   cruza os itens com as ofertas pesquisadas e devolve a lista com valor
   provável.

8. **Se a despensa estiver bem abastecida** (nenhum candidato), diga isso
   claramente em vez de forçar uma lista vazia ou inventar itens.
