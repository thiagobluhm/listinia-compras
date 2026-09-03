# Regra de aderência — JAMAIS INVENTAR

Vale para **todos** os agentes deste plugin, sem exceção e sem "só dessa vez".

## Por que aqui pesa mais que no lado do consumidor

No plugin do consumidor, um número errado estraga a lista de compras de uma
casa. Aqui, um número errado é uma **oferta publicada**.

Ela chega a todo mundo que pedir preço no Listinia. E, no Brasil, oferta
anunciada vincula: pelo Código de Defesa do Consumidor, o preço divulgado
obriga o fornecedor a cumprir. Uma vírgula no lugar errado não é um bug —
é um prejuízo que a loja é obrigada a honrar, multiplicado por quantas
pessoas virem.

Por isso, aqui, **na dúvida não publica**. Perguntar ao lojista custa trinta
segundos. Publicar errado custa dinheiro dele e a confiança do consumidor
no Listinia inteiro.

## O que é proibido

- ❌ **Adivinhar de que coluna veio o quê.** Planilha com "VALOR" e "VLR
  ANTERIOR" não se resolve por palpite: se não está claro qual é o preço
  promocional, pergunte antes de mapear.
- ❌ Completar nome de produto truncado ("ARROZ TIO JO 5K") pelo que
  "provavelmente é". Mande como está ou pergunte.
- ❌ Converter unidade de cabeça. 500g não vira 0,5kg sem o lojista mandar.
- ❌ Preencher `preco_de` com estimativa, margem ou percentual "normal de
  mercado". Sem preço anterior na planilha, o campo fica vazio.
- ❌ Inventar EAN, ou "corrigir" um EAN com dígito verificador errado.
- ❌ Publicar linha que a validação rejeitou, reescrevendo o dado para ela
  passar. A rejeição é informação, não obstáculo.
- ❌ Somar, contar ou fechar total de cabeça. Conta é por código.
- ❌ Dizer "publicado" quando o servidor devolveu erro, ou omitir quantas
  linhas ficaram de fora.

## O que fazer no lugar

1. **Coluna ambígua → pergunte**, mostrando as duas primeiras linhas da
   planilha para o lojista decidir. Uma pergunta antes vale mais que um
   encarte errado no ar.
2. **Campo ausente → vazio**, nunca estimado.
3. **Linha rejeitada → mostre o motivo em português** e pergunte se ele quer
   corrigir e republicar, ou publicar sem ela.
4. **Nunca publique uma planilha que você não conseguiu ler inteira.** Se
   deu para ler 300 de 480 linhas, isso é dito antes de qualquer coisa — o
   lojista decide se publica parcial ou manda o arquivo de novo.

## A prévia é obrigatória

Nenhum encarte vai ao ar sem o lojista ver, antes: quantas linhas entraram,
quantas foram rejeitadas e por quê, o período de vigência, e uma amostra
dos itens com o preço que será publicado. Ele confirma; só então publica.

Não existe "publiquei porque parecia certo".
