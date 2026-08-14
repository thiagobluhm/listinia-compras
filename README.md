# Listinia Compras

Plugin de Cowork para gestão pessoal de despensa: captura notas fiscais
(por QR code ou foto), reconhece o que ainda tem na geladeira/despensa por
foto, mantém um registro de compras e um dashboard sempre atualizados,
gera listas de compras baseadas no seu consumo real, e pesquisa preços em
encartes de supermercado.

Este plugin é um companheiro **standalone** ao produto Listinia (não
depende do backend/SaaS Listinia estar no ar) e foi desenhado para
funcionar **igual em qualquer canal — celular, web ou desktop**, já que a
maioria das pessoas usa o Cowork pelo celular. Veja a seção "Persistência
dos dados" abaixo antes de usar no dia a dia.

## O que ele faz

| Skill | O que faz |
|---|---|
| `captura-nota-fiscal` | Lê o QR code da nota (Playwright abre a página da SEFAZ) ou, se não der, lê a foto direto. Extrai os itens da compra. |
| `checagem-visual-despensa` | Reconhece itens em fotos da geladeira/despensa e confirma com você o que já acabou, como parte de gerar a lista de compras. |
| `despensa-dados` | Mantém o registro de compras e o estoque atual por item (formato JSONL), com categoria e dias restantes de estoque. Exporta como XLSX sob demanda. |
| `dashboard-despensa` | Dashboard em Markdown, sempre atualizado, com gasto por categoria, top produtos, mercados mais usados e itens acabando. Renderiza em qualquer canal. |
| `gerador-lista-compras` | Gera a lista de compras da próxima ida ao mercado, baseada no consumo real e na sua frequência de compra. |
| `pesquisa-encartes-mercado` | Cadastra seus 3–5 mercados preferidos e pesquisa preços atuais nos sites deles via Playwright, cruzando com sua lista de compras. |
| `alerta-estoque-baixo` | Verifica o que está acabando e, se você quiser, agenda uma checagem recorrente com notificação. |

## Como usar

1. Fotografe ou anexe uma nota fiscal e diga algo como "captura essa nota".
2. Depois de algumas compras, peça "monta minha lista de compras" ou "como
   tá minha despensa". Se quiser mais precisão, anexe fotos da geladeira e
   da despensa junto do pedido da lista — o plugin confirma com você o que
   ainda tem antes de fechar a lista.
3. Na primeira vez que pedir preços, o Cowork vai te perguntar quais
   mercados você usa (nome, endereço, site, página de ofertas).
4. Peça o dashboard quando quiser ver o panorama geral de gastos.
5. Peça a planilha (`.xlsx`) quando quiser abrir os dados no Excel.

## Arquivos que o plugin gera

- `despensa.jsonl` — log de eventos (compras, ajustes, checagens visuais); é a fonte de verdade
- `despensa.xlsx` — exportação sob demanda, gerada a partir do JSONL, não é a fonte de verdade
- `mercados.json` — mercados preferidos cadastrados
- `config-habitos.json` — frequência de compra e durações de categoria personalizadas
- `Listinia - Dashboard.md` — dashboard em Markdown, sempre atualizado

## ⚠️ Persistência dos dados (importante)

Cada conversa nova do Cowork começa do zero — a maioria das pessoas usa o
Cowork pelo celular, sem nenhum dispositivo conectado. Para os dados não
"resetarem" a cada chat, o plugin segue uma estratégia em camadas, sempre
tentando a melhor opção disponível, **sem nunca obrigar nada**:

1. **Google Drive conectado (recomendado, funciona em qualquer canal)**:
   os arquivos ficam salvos no Google Drive da sua conta e são lidos/
   atualizados automaticamente a cada conversa — celular, web ou desktop,
   tanto faz. É a única camada 100% automática: depois de conectar o
   Drive uma vez (nas configurações de conectores do Claude), você não
   precisa fazer mais nada manual.
2. **Sem Google Drive, com anexo manual**: você pode anexar o arquivo
   salvo de uma conversa anterior no início de uma nova conversa pra
   continuar de onde parou, e no fim recebe o arquivo atualizado pra
   guardar. Funciona sem depender de nenhum conector, mas dá mais
   trabalho e tem mais chance de erro humano (esquecer de salvar, anexar
   versão antiga) — recomendamos conectar o Google Drive se possível.
3. **Sem nenhum dos dois**: os dados existem só durante aquela conversa. O
   plugin avisa isso claramente no início, e sempre oferece os arquivos
   pra download no fim, como registro.

O dashboard (Markdown) e a checagem de estoque agendada (`alerta-estoque-
baixo`) funcionam de verdade apenas com a Camada 1 (Drive) — uma tarefa
agendada roda numa sessão nova, sem anexo manual possível.

## Dependência técnica

Este plugin usa o servidor MCP oficial do Playwright (`@playwright/mcp`,
via `npx`) para abrir páginas da SEFAZ e sites de supermercado — requer
Node.js disponível no ambiente onde o Cowork roda (normalmente já presente
no sandbox do Cowork). Para persistência automática (Camada 1), requer o
conector do Google Drive conectado na conta do Claude — opcional, mas
recomendado.

## Origem das regras de negócio

As categorias de produto, as durações padrão de estoque por categoria
(ex.: hortifrúti 5 dias, laticínios 10, limpeza 45) e a fórmula de dias
restantes foram portadas diretamente do backend real do app Listinia do
autor (`categorizer.py`, `config.py`, `despensa.py`), para manter
consistência com um sistema já validado em produção, em vez de valores
inventados.

## Autoria

Desenvolvido por Thiago Bluhm — AIstein LTDA.

## Roadmap (fora do escopo desta versão)

A pesquisa de encartes hoje é feita ao vivo, via scraping. A ideia é que,
futuramente, isso evolua para um MCP dedicado conectando diretamente ao
marketplace de ofertas do backend Listinia (onde supermercados cadastrados
competem por oferta), e a persistência possa opcionalmente usar o backend
real do Listinia em vez do Google Drive, para quem tiver conta no app.
Esse MCP ainda não existe e não faz parte deste plugin.
