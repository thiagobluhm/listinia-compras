# Listinia Compras

Plugin para Codex e Claude/Cowork para gestão da despensa de casa: captura notas fiscais
(QR code ou foto), reconhece o que ainda tem na geladeira/despensa por
foto, mantém a despensa e o histórico de gasto no servidor Listinia, gera
listas de compras baseadas no consumo real e pesquisa preços nos encartes
dos supermercados.

Funciona igual em qualquer canal — celular, web ou desktop — porque os
dados vivem no servidor, não em arquivo local.

## Arquitetura no Codex

No Codex, as sete skills conduzem os fluxos diretamente e usam os MCPs
declarados pelo plugin. Não dependem das ferramentas `Agent`, `TaskCreate`
ou `create_trigger` do Claude. O diretório `agents/` foi preservado apenas
para compatibilidade com a distribuição Claude/Cowork.

## Arquitetura legada: um orquestrador e cinco especialistas

A partir da versão 1.0, o plugin é um **time de agentes**. As skills não
executam mais o trabalho: elas entregam a missão ao orquestrador, que
distribui, acompanha e reporta.

```
                    listinia-orquestrador
                    (a única voz da conversa)
                              │
        ┌────────────┬────────┴────────┬─────────────┬──────────────┐
        │            │                 │             │              │
  leitor-visual  navegador        despensor      listador    analista-gastos
    (os olhos)  (o navegador)   (a ESCRITA)    (a lista)      (os gastos)
```

| Agente | Dono de | Escreve? |
|---|---|---|
| `listinia-orquestrador` | a conversa, as missões, o progresso | não |
| `listinia-leitor-visual` | QR code, foto de cupom, foto de geladeira | não |
| `listinia-navegador` | Playwright: página da Receita e sites de encarte | não |
| `listinia-despensor` | registrar nota, ajustar, remover, exportar | **sim, e só ele** |
| `listinia-listador` | a lista de compras a partir do estado real | não |
| `listinia-analista-gastos` | dashboard e gasto por categoria/mês/mercado | não |

Por que dividir assim:

- **Uma única porta de escrita.** Só o `despensor` grava. Nenhum outro
  agente pode alterar a despensa nem por engano.
- **Contexto frio a favor.** Varrer cinco sites de supermercado ou
  decodificar QR code polui o contexto. Isolado num subagente, o ruído fica
  lá e a conversa principal continua limpa.
- **Paralelismo.** Dashboard e lista pedidos juntos rodam ao mesmo tempo.
- **Uma voz só.** O usuário fala com o orquestrador do início ao fim — os
  especialistas nunca aparecem.

## A regra que atravessa todos: JAMAIS INVENTAR

Todo agente carrega uma seção de aderência à incerteza, e a regra completa
está em `references/jamais-inventar.md`. Em resumo: campo não lido com
clareza volta como `null` e vira pergunta ao usuário, nunca palpite. Preço
que não estava escrito na página não existe. Seção de dashboard sem dado é
seção vazia com explicação, não projeção. Reconhecimento por foto é sempre
sugestão a confirmar. **Faltar dado é sempre melhor que ter dado falso** —
uma despensa com número errado estraga a lista de compras e o controle de
gasto inteiro.

O orquestrador é o último filtro: ele nunca completa o que um subagente
deixou em branco, nunca apresenta resultado parcial como completo, e sempre
diz o que ficou de fora antes de gravar.

## As skills

| Skill | O que faz |
|---|---|
| `captura-nota-fiscal` | Lê a nota pelo QR code (página oficial da Receita via Playwright) ou pela foto do cupom, e registra na despensa se você confirmar. |
| `checagem-visual-despensa` | Reconhece itens em fotos da geladeira/despensa e confirma com você o que acabou — só dentro do fluxo da lista de compras. |
| `despensa-dados` | Registra compras, ajusta ou remove produto, lê o estado atual, exporta XLSX. |
| `dashboard-despensa` | Dashboard em Markdown: gasto por categoria, top produtos, mercados, itens críticos, histórico. |
| `gerador-lista-compras` | Monta a lista da próxima ida ao mercado com base no consumo real e na sua cadência. |
| `pesquisa-encartes-mercado` | Cadastra seus mercados preferidos e pesquisa os preços atuais nos sites deles. |
| `alerta-estoque-baixo` | Diz o que está acabando e, se você quiser, agenda essa checagem para rodar sozinha. |

## Como usar

1. Fotografe ou anexe uma nota e diga "captura essa nota".
2. Depois de algumas compras, peça "monta minha lista" ou "como tá minha
   despensa?". Para mais precisão, anexe fotos da geladeira e da despensa
   junto com o pedido da lista.
3. Na primeira vez que pedir preços, o plugin pergunta em quais mercados
   você compra.
4. Peça a planilha quando quiser abrir os dados no Excel.

## Onde os dados ficam

**No servidor Listinia**, via o MCP `listinIA` — fonte única de verdade.
Não há mais arquivo JSONL, planilha-fonte, Google Drive nem sincronização
entre canais: a mesma despensa aparece no celular e no desktop porque está
no servidor.

Como consequência, a checagem agendada de estoque baixo funciona
normalmente numa sessão nova — ela não depende de anexo nem de pasta
conectada.

## Dependências

**MCP `listinIA` — já vem no plugin.** Ele guarda a despensa e as notas, e
calcula dias restantes, status e categoria.

Nada para configurar: ao instalar o plugin, o cliente abre a tela de login do
Listinia na primeira vez que você usar alguma skill. Você entra com sua conta
Google e pronto — **a despensa é sua, isolada de qualquer outra pessoa que
use o plugin**. Não há chave para colar, nem conector para adicionar à mão.

Quem quiser rodar o servidor por conta própria troca a `url` no `.mcp.json`
do plugin pelo seu próprio endereço.

**MCP Playwright** (`@playwright/mcp`, via `npx`) — também vem no plugin.
Abre a página da Receita e os sites de encarte. Requer Node.js no ambiente
onde o Cowork roda.

Uma única coisa ainda não tem casa no servidor: a lista de **mercados
preferidos**. Ela é salva numa pasta conectada quando houver uma, e
perguntada na hora quando não houver.

## De onde vêm as regras de negócio

Categorias, validade padrão por categoria e a fórmula de dias restantes
rodam hoje **no servidor** (`categorizer.py`, `config.py`, `despensa.py` do
backend real do app Listinia). Os agentes consomem esses números prontos e
têm proibição explícita de recalculá-los por conta própria — é o que
mantém o plugin e o app dizendo a mesma coisa.

## Autor

Thiago Bluhm — AIstein LTDA.

## Roadmap

A pesquisa de encartes é feita hoje por varredura ao vivo dos sites. O plano
é evoluir para um MCP dedicado ligado ao marketplace de ofertas do backend
Listinia, onde os supermercados cadastrados disputam a demanda. Esse MCP
ainda não existe.

