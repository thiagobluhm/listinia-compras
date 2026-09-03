---
name: integracao-automatica
description: Explains and sets up automatic flyer publishing from the store's own system (ERP, cron job, watched folder or integration platform) into Listinia via the HTTP endpoint, using the establishment's API key. Use when the retailer asks to automate publishing, mentions their ERP or PDV system, says "meu sistema pode mandar sozinho?", "quero automatizar o encarte", "tem API?", or asks about the integration key.
---

# Integração Automática

O lojista não precisa abrir conversa para publicar. O sistema dele pode
mandar o encarte direto, com a mesma validação e o mesmo comportamento do
fluxo pelo chat — é literalmente o mesmo código do outro lado.

**Você não constrói a automação dele.** Você entrega o que ele precisa para
o time de TI da loja construir: o endereço, o formato e a chave.

## O que entregar

```
POST https://listinia-despensa.thiagobluhm.workers.dev/v1/encarte
Authorization: Bearer <chave do estabelecimento>
Idempotency-Key: <hash do arquivo>
Content-Type: application/json

{
  "vigencia_inicio": "2026-09-01",
  "vigencia_fim": "2026-09-07",
  "substituir_vigente": true,
  "itens": [
    {"produto": "Arroz Branco Tipo 1 5kg", "marca": "Tio João", "unidade": "pct", "preco_de": 32.90, "preco": 24.90, "ean": "7896006711117"}
  ]
}
```

A resposta traz `gravados` e `rejeitados`, linha a linha com o motivo —
igual ao que o lojista vê no chat.

O formato completo dos campos está em
`${CLAUDE_PLUGIN_ROOT}/references/contrato-encarte.md`. É esse arquivo que o
TI da loja recebe.

## Três coisas para explicar, em português de gente

**A chave identifica a loja.** Quem tem a chave publica no lugar dela.
Guardar em variável de ambiente, nunca no código versionado. Vazou, gera
outra — a anterior morre na hora.

**`Idempotency-Key` evita encarte duplicado.** Qualquer string estável
derivada do arquivo serve, como o hash do conteúdo. Sem ela, um retry do
sistema publica o mesmo encarte duas vezes — e é assim que a loja descobre o
problema, com o cliente reclamando de oferta dobrada.

**Linha rejeitada não derruba o encarte.** O resto sobe, e o sistema da loja
deve registrar os rejeitados em log em vez de ignorar a resposta. Encarte que
sobe "com sucesso" e 40 itens faltando é pior que erro na cara.

## Se ele não tiver a chave

Perdeu, nunca guardou, ou o cadastro foi feito por outra pessoa: gere outra
pela skill `cadastro-estabelecimento`. Avise que a anterior para de funcionar
imediatamente — se já houver integração rodando, ela precisa ser atualizada
no mesmo momento.
