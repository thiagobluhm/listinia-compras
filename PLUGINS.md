# Os dois plugins do Listinia

O Listinia tem **dois lados**, e cada um é um plugin separado, com público,
servidor MCP e permissões próprios.

| | **Listinia Compras** | **Listinia Mercado** |
|---|---|---|
| Para quem | consumidor, na própria casa | lojista — mercado, farmácia, varejo |
| O que faz | mantém a despensa e gera a lista de compras | publica encartes e mede o resultado deles |
| MCP | `https://compras-mcp.listinia.com.br/mcp` | `https://mercado-mcp.listinia.com.br/mcp` |
| Escopos | `despensa.read`, `despensa.write` | `encarte.read`, `encarte.write` |
| Skills / agentes | 7 / 6 | 5 / 4 |

Os dois são isolados de propósito: o plugin do lojista **não acessa a despensa
de nenhum consumidor**, e o do consumidor não publica nada. O que liga um ao
outro é a oferta publicada — ela aparece na lista de compras de quem precisa
daquele item.

---

## Listinia Compras

Fecha o ciclo doméstico inteiro: a nota fiscal da compra vira estoque, o
estoque vira lista, e a lista volta cotada contra os encartes.

### O que ele faz

**`captura-nota-fiscal`** — Lê a nota fiscal (NFC-e) de mercado ou farmácia.
O caminho principal é decodificar o QR code e ler a página oficial da SEFAZ,
que é exato; foto do cupom é o plano B. Depois de confirmado, registra tudo na
despensa.

**`despensa-dados`** — A gestão da despensa em si: registrar compra, ajustar
ou remover um produto na mão, ver o estoque atual com dias restantes e status,
exportar em XLSX. A despensa vive no servidor — não há arquivo local, planilha
ou sincronização entre canais; o mesmo estado aparece no celular, na web e no
desktop.

**`gerador-lista-compras`** — Monta a lista a partir do consumo real e da
cadência de ida ao mercado (padrão 7 dias). Usa a mesma lógica determinística
já validada em produção no app Listinia.

**`checagem-visual-despensa`** — Reconhece o que aparece em fotos da geladeira
e da despensa e cruza com o estoque registrado, para separar o que ainda tem
do que provavelmente acabou. Roda **só dentro do fluxo da lista**, nunca
sozinho e nunca sem a pessoa pedir.

**`pesquisa-encartes-mercado`** — Cota a lista contra os encartes publicados
no Listinia: mais barato por item, alternativas e total estimado. Item sem
oferta volta como "sem cotação" e fica fora da soma. Só cai para navegar o site
do mercado quando a loja ainda não está na plataforma.

**`alerta-estoque-baixo`** — Lista o que está para acabar, por dias restantes.
Pode virar uma checagem recorrente — mas só se a pessoa pedir.

**`dashboard-despensa`** — Panorama de gasto: total do mês, por categoria, top
produtos, mercados mais usados, itens críticos. Entregue em Markdown, que
renderiza em qualquer canal (a maioria usa pelo celular).

### Os agentes

`listinia-orquestrador` é a única voz da conversa e decide quem aciona.
Abaixo dele: `listinia-leitor-visual` (QR, cupom, fotos), `listinia-navegador`
(o único que dirige o Playwright — página da Receita e sites de encarte),
`listinia-listador` (a lógica da lista), `listinia-analista-gastos` (o
dashboard) e `listinia-despensor` — **o único autorizado a escrever** na
despensa.

---

## Listinia Mercado

O lado do lojista: publicar oferta e, principalmente, provar que ela deu
resultado.

### O que ele faz

**`cadastro-estabelecimento`** — Cadastra a loja (ramo, nome, cidade/UF, CNPJ
opcional) e entrega a chave de API. Sem estabelecimento cadastrado nenhuma
publicação funciona. Uma conta administra **uma** loja; rede com várias
precisa de uma conta por loja.

**`publicar-encarte`** — Publica o encarte a partir da planilha da própria
loja (csv, xlsx ou json), mapeando as colunas dela para o contrato do
Listinia. Duas travas: coluna de preço ambígua vira pergunta, nunca palpite
(é a diferença entre publicar oferta e publicar prejuízo); e sem vigência, não
sobe. O encarte anterior só é substituído depois que o novo entrou inteiro.

**`encartes-no-ar`** — Mostra o que está valendo hoje, os itens por categoria
e o que mudou de preço em relação ao encarte anterior. Também apaga um
publicado por engano. Encarte ativo com vigência vencida é tratado como
alerta: a loja está sem oferta no ar e provavelmente não percebeu.

**`desempenho-do-encarte`** — O relatório que diferencia a plataforma. Banner e
encarte de papel medem atenção (view, clique, tiragem) porque o anunciante não
enxerga a compra. Aqui o dado primário **é a compra**: o consumidor captura a
nota fiscal, então dá para dizer que a oferta apareceu para quem precisava
daquele item, que ele foi à loja, e que o item saiu na nota — naquele preço.
Quatro estágios: alcance qualificado, captura na lista, compra confirmada por
nota, e se o preço cobrado bateu com o anunciado.

**`integracao-automatica`** — Para o ERP publicar sozinho, sem abrir conversa:
`POST https://mercado-mcp.listinia.com.br/v1/encarte` com a chave do
estabelecimento. É o mesmo código do fluxo por chat, com a mesma validação.

### Os agentes

`mercado-orquestrador` é a única voz da conversa. `mercado-leitor-planilha`
traduz o arquivo da loja para o contrato (sem adivinhar coluna),
`mercado-conferente` lê o que está publicado, e `mercado-publicador` é **o
único autorizado a mudar o que está no ar**.

---

## A regra que vale nos dois

`references/jamais-inventar.md` — o plugin controla dinheiro e comida de uma
casa, e do outro lado controla o que uma loja anuncia. Preço chutado estraga o
controle de gasto; quantidade chutada faz a pessoa voltar do mercado sem o que
precisava.

**Faltar dado é sempre melhor que ter dado falso.** Nada de preencher o que não
foi lido com clareza, completar item pelo que "costuma ser", recalcular de
cabeça o que o servidor já calcula, ou inventar oferta de um site que não
carregou. Reconhecimento por foto e correspondência aproximada de nome são
sugestões a confirmar, e têm que ser apresentadas assim. Seção sem dado é
seção vazia, com uma linha dizendo o que falta.

O desenho dos agentes reforça isso: em cada plugin **um único agente escreve**
(`listinia-despensor`, `mercado-publicador`), e todos os outros são somente
leitura.

## Instalação

Instale o **plugin** (`plugins/listinia-compras.zip`), não só o conector. O
conector sozinho entrega as ferramentas cruas, sem as skills e sem os agentes
— e é o plugin que já traz a URL certa do MCP pré-preenchida.
