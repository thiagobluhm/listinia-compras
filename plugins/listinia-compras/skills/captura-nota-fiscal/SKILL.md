---
name: captura-nota-fiscal
description: Captures a Brazilian grocery or pharmacy receipt (nota fiscal / NFC-e) by decoding its QR code and reading the official SEFAZ page, with a single-look photo reading as fallback, then registers it in the pantry. Use when the user says things like "captura essa nota", "lê essa nota fiscal", "escaneia esse cupom", "processa essa nota de compra", "joga essa nota na despensa", or attaches a photo/PDF of a supermarket or pharmacy receipt.
---

# Captura de Nota Fiscal

Delegue este fluxo ao agente **`listinia-orquestrador`** (ferramenta
`Agent`). Ele conduz a conversa e aciona os subagentes na ordem certa —
`listinia-leitor-visual` para o QR/foto, `listinia-navegador` para a página
da Receita, `listinia-despensor` para gravar.

## A missão que você entrega ao orquestrador

Passe, sempre:

- o pedido da pessoa, nas palavras dela;
- **o caminho de cada imagem ou PDF anexado** — o orquestrador e os
  subagentes não enxergam anexo, abrem pelo caminho;
- que o objetivo é capturar a nota e, se a pessoa confirmar, registrá-la na
  despensa.

## O que o orquestrador tem que garantir (repita na missão)

1. **Pergunte o método no início** — QR code (mais rápido e exato) ou foto
   do cupom — mesmo com a foto já anexada, porque o cupom inteiro costuma
   trazer o QR no rodapé. Só pule se a pessoa já disse qual quer.
2. **Item ilegível interrompe o fluxo.** Não monte lista com `?` e siga
   sozinho: pergunte se ela quer completar lendo na nota ou seguir sem
   aqueles itens. Item descartado sai da lista — não vai adiante como
   `null`.
3. **Antes de gravar, pergunte**: registrar na despensa, ou só entregar a
   nota organizada sem salvar nada?
4. **Nada de insistir.** Uma tentativa. Não deu para ler — QR ilegível,
   página que não carregou, ou Playwright indisponível — peça outra foto,
   focada no QR code. É proibido montar a URL da nota à mão, usar busca ou
   `WebFetch` como substituto, e é proibido recortar, ampliar ou tratar a
   imagem para "ler melhor".
5. **JAMAIS INVENTAR.** Preço, quantidade ou nome não lido com clareza não
   entra chutado, em hipótese alguma. Melhor faltar dado que ter dado
   falso.
6. **Depois de gravar, pare** — sem conferência, sem dashboard, sem
   relatório. Feche perguntando o que vem agora: outra nota, a lista de
   compras, ou parar por aqui.

## Se o orquestrador não estiver disponível

Siga o mesmo roteiro chamando os subagentes direto, nesta ordem:
`listinia-leitor-visual` → (se veio URL) `listinia-navegador` →
confirmação com a pessoa → `listinia-despensor`.
