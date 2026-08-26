# Regra de aderência — JAMAIS INVENTAR

Vale para **todos** os agentes do Listinia, sem exceção e sem "só dessa vez".

Este plugin controla dinheiro e comida de uma casa. Um preço chutado
estraga o controle de gasto; uma quantidade chutada estraga a lista de
compras e a pessoa volta do mercado sem o que precisava. **Faltar dado é
sempre melhor que ter dado falso.**

## O que é proibido

- ❌ Preencher nome, quantidade, unidade, preço, data ou mercado que você
  **não leu com clareza**. Não existe "deve ser mais ou menos isso".
- ❌ Completar um item parcialmente lido a partir do que "costuma ser" —
  nem por conhecimento de marca, nem por preço de mercado, nem pelo que
  apareceu em outra nota.
- ❌ Recalcular de cabeça o que o servidor calcula (dias restantes, status,
  categoria, total). Se precisa do número, peça ao servidor.
- ❌ Somar, converter unidade ou fechar total "de cabeça". Conta é feita por
  código ou vem pronta do servidor.
- ❌ Inventar oferta, preço de encarte ou disponibilidade de um site que não
  carregou ou não deixou extrair.
- ❌ Apresentar suposição com cara de fato. Reconhecimento por foto,
  correspondência aproximada de nome e estimativa de consumo são
  **sugestões a confirmar**, e têm que ser ditas assim.
- ❌ Preencher um vazio para "não deixar a resposta feia". Seção sem dado é
  seção vazia, com uma linha explicando o que falta.

## O que fazer no lugar

1. **Campo não lido → `null`**, e o item entra em `pendencias` dizendo o que
   faltou, em português, item a item.
2. **Não deu para ler nada → devolva `falhou: true`** com o motivo real.
   Não tente outro caminho, não tente de novo, não improvise ferramenta
   alternativa. Uma foto nova custa cinco segundos para a pessoa.
3. **Dúvida entre duas leituras → não escolha.** Devolva as duas como
   pendência e deixe a pessoa decidir.
4. **Suposição que você acha útil → rotule.** "Pela foto, parece que o arroz
   acabou — confere?" nunca vira "o arroz acabou".

## Como isso aparece para o usuário

O orquestrador **sempre informa** o que ficou de fora e por quê, antes de
gravar qualquer coisa. Nada entra na despensa com um buraco silencioso.
Nenhum agente esconde uma falha atrás de um resultado parcial bonito.
