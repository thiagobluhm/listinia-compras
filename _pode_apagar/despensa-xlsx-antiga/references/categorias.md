# Categorias de produto e prazos de validade de estoque

Esta tabela é portada diretamente da lógica de produção do app Listinia
(`categorizer.py` e `config.py`). Use estas mesmas categorias, keywords e
durações — não invente uma taxonomia nova, para manter consistência com o
que já funciona no app real.

## Como classificar um item

Compare o nome do produto (minúsculo) contra as keywords de cada categoria
abaixo, na ordem listada. A primeira categoria cujo keyword aparecer no nome
vence. Se nenhuma bater, a categoria é `outros`.

## Categorias, keywords e duração padrão de estoque (dias)

| Categoria | Duração padrão (dias) | Exemplos de keywords |
|---|---|---|
| carnes & aves | 7 | bife, carne, frango, alcatra, patinho, picanha, costela, linguiça, salsicha, bacon, presunto, coxão, contrafilé, sobrecoxa, coxa, asa, pato, peru, cordeiro, porco, suíno |
| hortifrúti | 5 | tomate, alface, cebola, alho, cenoura, batata, beterraba, abobrinha, berinjela, pimentão, brócolis, couve, espinafre, pepino, milho, mandioca, repolho, rúcula, banana, maçã, laranja, limão, abacaxi, manga, melão, melancia, uva, pera, morango, mamão, coco, abacate e demais frutas/verduras/legumes comuns |
| laticínios | 10 | leite, queijo, iogurte, manteiga, creme de leite, requeijão, nata, coalhada, minas, prato, muçarela, catupiry, cottage, parmesão, ricota, danone, yakult, activia |
| padaria | 5 | pão, baguete, bisnaga, croissant, bolo, torta, rosca, broa, pão de queijo, tapioca, torrada, ciabatta, focaccia |
| congelados | 30 | congelad*, batata mccain, nugget, empanado, lasanha, pizza, peixe filé, camarão, lula, sorvete, açaí, polpa de fruta |
| bebidas | 14 | água, suco, refrigerante, cerveja, vinho, energético, isotônico, chá, café solúvel, achocolatado, coca, guaraná, sprite, fanta |
| mercearia | 30 | arroz, feijão, macarrão, massa, farinha, açúcar, sal, óleo, azeite, vinagre, molho, ketchup, maionese, mostarda, tempero, caldo, atum, sardinha, milho verde, ervilha, palmito, azeitona, geleia, mel, aveia, granola, cereal, lentilha, grão de bico, amendoim, quinoa |
| biscoitos & salgadinhos | 21 | biscoito, bolacha, salgadinho, chips, wafer, cream cracker, oreo, trakinas, doritos, ruffles, cheetos |
| limpeza | 45 | sabão, detergente, amaciante, água sanitária, alvejante, desinfetante, multiuso, esponja, lã de aço, papel toalha, rodo, vassoura, sacos de lixo, inseticida, repelente |
| higiene & perfumaria | 45 | shampoo, condicionador, sabonete, creme dental, fio dental, enxaguante, escova de dente, desodorante, absorvente, hidratante, protetor solar, maquiagem, algodão, cotonete |
| pet | 30 | ração, petisco, areia para gato, coleira, shampoo pet, vermífugo, antipulgas |
| outros | 14 | fallback — nada bateu acima |

## Categorias de farmácia (nicho separado)

Itens comprados sob o tipo "farmácia" usam outra classificação, para não
misturar com o supermercado:

| Categoria | Exemplos de keywords |
|---|---|
| medicamentos | comprimido, cápsula, xarope, pomada, colírio, dipirona, ibuprofeno, paracetamol, amoxicilina, antibiótico |
| vitaminas & suplementos | vitamina, suplemento, ômega, probiótico, whey, colágeno, magnésio, zinco, cálcio |
| primeiros socorros | curativo, band-aid, micropore, atadura, gaze, seringa, termômetro, álcool gel |
| higiene médica | sabonete íntimo, soro, fralda, lenços umedecidos |
| outros (farmácia) | fallback |

## Local de armazenamento (opcional, útil pro usuário)

Se quiser, classifique também onde o item costuma ficar guardado:
- **geladeira**: laticínios, hortifrúti fresco, embutidos, sucos refrigerados
- **freezer**: congelados, sorvetes, carnes/peixes congelados
- **limpeza**: produtos de limpeza
- **armário**: tudo o mais (secos, enlatados, bebidas fechadas, biscoitos, higiene)

## Frequência de compra padrão

Se o usuário ainda não configurou nada em `config-habitos.json`, use
`frequencia_dias = 7` (compra semanal) — é o default real do app.
