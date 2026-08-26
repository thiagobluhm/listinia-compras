# Listinia Mercado

Versão Codex do plugin para **supermercados, farmácias e outros varejos**. Publica
o encarte de ofertas no Listinia a partir da planilha que a loja já usa,
confere o que está no ar, e entrega a chave para o sistema da loja publicar
sozinho.

As ofertas publicadas aqui aparecem para todo consumidor que usa o Listinia
para montar a lista de compras — é o outro lado do plugin `listinia-compras`.

## Arquitetura no Codex

As cinco skills conduzem os fluxos diretamente com o MCP `listinIA` e as
capacidades de planilhas do Codex. Esta cópia não altera o pacote Claude.

## Arquitetura original do pacote Claude

```
                  mercado-orquestrador
                (a única voz com o lojista)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
 leitor-planilha       publicador          conferente
 (lê csv/xlsx/json)   (a ESCRITA)      (o que está no ar)
```

| Agente | Dono de | Escreve? |
|---|---|---|
| `mercado-orquestrador` | a conversa, as missões, a prévia | não |
| `mercado-leitor-planilha` | ler o arquivo e mapear as colunas da loja | não |
| `mercado-publicador` | cadastrar, publicar, apagar, gerar chave | **sim, e só ele** |
| `mercado-conferente` | encartes no ar, itens, comparação com o anterior | não |

## A regra que atravessa todos: JAMAIS INVENTAR

Aqui ela pesa mais que no lado do consumidor. Lá, um número errado estraga a
lista de compras de uma casa. Aqui, é **uma oferta publicada** — que chega a
todo mundo que pedir preço e que, pelo Código de Defesa do Consumidor,
obriga a loja a cumprir. Uma vírgula no lugar errado não é bug: é prejuízo
que a loja tem que honrar.

Por isso: coluna ambígua vira pergunta com as primeiras linhas na tela, nunca
palpite. Nome truncado vai como está. Unidade não se converte de cabeça.
`preco_de` sem origem no arquivo fica vazio. Linha rejeitada é mostrada com
o motivo, nunca reescrita para passar. E **nenhum encarte vai ao ar sem o
lojista ver a prévia e confirmar**.

Regra completa em `references/jamais-inventar.md`.

## As skills

| Skill | O que faz |
|---|---|
| `cadastro-estabelecimento` | Registra a loja e entrega a chave de integração (mostrada uma vez). |
| `publicar-encarte` | Lê a planilha, mapeia as colunas, mostra a prévia e publica. |
| `encartes-no-ar` | O que está valendo, itens por categoria, o que mudou de preço, e remoção. |
| `integracao-automatica` | O endereço, o formato e a chave para o ERP da loja publicar sozinho. |
| `desempenho-do-encarte` | Quantas pessoas viram, quantas compraram de fato (por nota fiscal) e se o preço cobrado bateu com o anunciado. |

## O que diferencia isto de banner e encarte de papel

Banner mede **atenção** — view, clique, CTR — porque o anunciante não enxerga
a compra. Encarte de papel mede tiragem.

No Listinia o dado primário **é a compra**: o consumidor captura a nota
fiscal, então dá para dizer que a oferta apareceu para quem precisava daquele
item, que a pessoa foi ao mercado, e que o item saiu na nota naquele preço.
Quatro estágios, todos com dado real:

1. **Alcance qualificado** — apareceu para quem tinha o item na lista porque a
   despensa indicava que estava acabando. Intenção, não impressão.
2. **Captura da lista** — a oferta foi a mais barata e ganhou o item.
3. **Compra confirmada** — nota daquela loja, na vigência, com aquele item.
4. **Aderência de preço** — o cobrado bateu com o anunciado.

O casamento entre oferta e item da nota é exato (código de barras, ou nome
idêntico). **Subconta de propósito**: o resultado real é igual ou maior,
nunca menor.

E é **venda atribuída, não incremental** — o relatório não sabe se a pessoa
compraria de qualquer jeito. Medir isso exige segurar ofertas de uma fatia
dos usuários para comparar, e ainda não existe.

O lojista recebe coorte, nunca pessoa: célula com poucos compradores volta
suprimida. É o que mantém o consumidor confiando no Listinia — que é o que dá
valor ao anúncio.

## Como usar

1. Na primeira vez, cadastre a loja: ramo, nome, cidade. Guarde a chave que
   aparece — ela não é mostrada de novo.
2. Anexe a planilha do encarte e diga "sobe esse encarte". Confira a prévia
   antes de confirmar.
3. Pergunte "o que está no ar" quando quiser conferir, e "o que mudou de
   preço" para comparar com o encarte anterior.
4. Cadastre **como o nome da loja sai no cupom fiscal** — sem isso as
   compras dos clientes não são atribuídas a você, e o relatório vem vazio.
5. Depois de alguns dias, pergunte "meu encarte funcionou?".
6. Se a loja tiver ERP, peça a integração automática — o sistema passa a
   publicar sem abrir conversa.

## O formato da planilha

O plugin aceita **csv, xlsx e json**, e reconhece os nomes de coluna mais
comuns de sistema de mercado (`descricao`, `vlr promo`, `gtin`...). Quando
uma coluna é ambígua, ele pergunta em vez de adivinhar.

Obrigatórios: produto, preço, unidade. Opcionais: marca, preço anterior,
código de barras, categoria, limite por cliente, observação.

`references/contrato-encarte.md` tem o formato completo — é o arquivo para
entregar ao TI da loja.

## Substituição e histórico

Publicar um encarte novo **substitui o vigente**, e o anterior só sai do ar
depois que o novo entrou inteiro — nunca existe uma janela com a loja sem
oferta publicada.

O encarte substituído sai da vitrine mas **permanece no histórico**. É o que
responde, mais tarde, se um preço está realmente baixo ou se subiu e desceu.
Apagar de vez existe (`encartes-no-ar`), mas é para engano real: o histórico
não volta.

## Dependências

**MCP `listinIA`** — já vem no plugin. Na primeira vez que você usar uma
skill, o cliente abre o login; você entra com sua conta Google e a loja fica
vinculada a ela.

Uma conta administra **um** estabelecimento. Rede com várias lojas precisa de
uma conta por loja.

## Autor

Thiago Bluhm — AIstein LTDA.
