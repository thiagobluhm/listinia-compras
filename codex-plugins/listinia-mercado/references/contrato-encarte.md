# Contrato de Encarte — Listinia B2B

Este é o formato que o Listinia aceita para publicação de encarte de
supermercado e farmácia. Vale igual para arquivo anexado no chat
(csv / xlsx / json) e para envio automático por HTTP — a validação é a
mesma dos dois lados.

Versão do contrato: `1`.

---

## 1. Colunas

| Campo | Obrigatório | Tipo | Observação |
|---|---|---|---|
| `produto` | **sim** | texto | Nome como o cliente vê na gôndola. Máx. 120 caracteres. |
| `preco` | **sim** | número | Preço promocional, em reais. Ponto ou vírgula decimal, ambos aceitos. |
| `unidade` | **sim** | texto | `un`, `kg`, `L`, `pct`, `cx`, `dz`. |
| `marca` | não | texto | Separar da marca ajuda o casamento com a lista do consumidor. |
| `preco_de` | não | número | Preço normal, para mostrar o desconto. |
| `ean` | não | texto | Código de barras (8, 12, 13 ou 14 dígitos). **É o que mais aumenta a precisão** — quando vem, o casamento deixa de depender do nome. |
| `categoria` | não | texto | Se omitida, o servidor classifica. Só informe para corrigir. |
| `limite_por_cliente` | não | inteiro | "Máx. 3 por CPF". |
| `observacao` | não | texto | "Somente na loja Centro", "leve 3 pague 2". |

**Nomes de coluna alternativos aceitos** (sem acento, maiúsculas ou
minúsculas, espaço ou underscore): `descricao`/`item`/`produto`;
`preco`/`preco_promocional`/`preco_oferta`/`valor`;
`preco_de`/`preco_normal`/`de`; `un`/`unidade`/`embalagem`;
`codigo_barras`/`gtin`/`ean`.

Coluna que não estiver nesta lista é ignorada, e o que foi ignorado é
mostrado na prévia antes de publicar.

## 2. Vigência

Vai fora das linhas, uma vez por encarte:

- `estabelecimento` — quem publica
- `tipo` — `mercado` ou `farmacia`
- `vigencia_inicio` e `vigencia_fim` — `AAAA-MM-DD`

No arquivo, pode vir como as primeiras linhas de cabeçalho (`chave;valor`)
ou ser informado na conversa na hora de publicar. No envio por HTTP, vai no
corpo, fora da lista de itens.

**Encarte sem vigência não é publicado.** Promoção vencida vazando para a
lista de compras do consumidor é o pior defeito possível deste produto.

## 3. Exemplos

**CSV**

```csv
produto;marca;unidade;preco_de;preco;ean
Arroz Branco Tipo 1 5kg;Tio João;pct;32,90;24,90;7896006711117
Leite Integral UHT 1L;Italac;un;5,49;3,99;7898080640017
Detergente Neutro 500ml;Ypê;un;;2,79;
```

**JSON**

```json
{
  "contrato": 1,
  "estabelecimento": "Mercado Bom Preço - Centro",
  "tipo": "mercado",
  "vigencia_inicio": "2026-09-01",
  "vigencia_fim": "2026-09-07",
  "itens": [
    {"produto": "Arroz Branco Tipo 1 5kg", "marca": "Tio João", "unidade": "pct", "preco_de": 32.90, "preco": 24.90, "ean": "7896006711117"}
  ]
}
```

**XLSX** — mesma estrutura do CSV, primeira aba, primeira linha como
cabeçalho. Célula mesclada, linha de título antes do cabeçalho e coluna
totalmente vazia são toleradas.

## 4. O que é rejeitado (linha a linha, com motivo)

- `produto` vazio ou só com números
- `preco` ausente, zero, negativo ou não numérico
- `preco` maior que `preco_de` (provável troca de coluna — rejeita em vez de
  publicar desconto invertido)
- `unidade` fora da lista
- `ean` com dígito verificador inválido
- linha duplicada (mesmo `ean`, ou mesmo `produto` + `unidade`)

Linha rejeitada **não impede** o resto do encarte de subir. O retorno traz
`gravados` e `rejeitados[]` com número da linha e motivo, e o lojista vê
isso antes de confirmar. Nada é adivinhado: coluna ambígua vira pergunta,
nunca palpite.

## 5. Substituição do encarte anterior

Publicar com `substituir_vigente: true` (padrão) apaga o encarte vigente
daquele estabelecimento e insere o novo — **na mesma transação**. Se a
inserção falhar, o encarte antigo continua no ar. Nunca existe uma janela
com o estabelecimento sem encarte nenhum.

Para republicar o mesmo arquivo sem duplicar (retry de automação, clique
duplo, reenvio), mande `idempotency_key` — qualquer string estável derivada
do arquivo, por exemplo o hash do conteúdo. Chave repetida devolve o
resultado da primeira publicação em vez de publicar de novo.

## 6. Envio automático (opcional, do lado do lojista)

O mesmo contrato aceita `POST /v1/encarte` com o JSON da seção 3, header
`Authorization: Bearer <token do estabelecimento>` e, opcionalmente,
`Idempotency-Key`. É o caminho para quem quiser plugar o próprio ERP, um
cron ou uma pasta monitorada — sem depender de ninguém abrir um chat.

O comportamento é idêntico ao da publicação pelo chat: mesma validação,
mesma substituição transacional, mesmo retorno com `gravados` e
`rejeitados[]`.
