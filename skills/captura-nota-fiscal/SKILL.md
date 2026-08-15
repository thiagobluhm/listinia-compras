---
name: captura-nota-fiscal
description: Captures a Brazilian grocery or pharmacy receipt (nota fiscal / NFC-e), reading its QR code and scraping the official SEFAZ page via Playwright to get the itemized purchase, falling back to reading the photo directly when the QR code isn't legible. Use when the user says things like "captura essa nota", "lê essa nota fiscal", "escaneia esse cupom", "processa essa nota de compra", "joga essa nota na despensa", or attaches a photo/PDF of a supermarket or pharmacy receipt.
---

# Captura de Nota Fiscal

Mesmo pipeline usado em produção no app Listinia real (`qrcode_reader.py` +
`sefaz_scraper.py`): QR code primeiro (mais preciso), foto como fallback.

O fluxo inteiro é: **ler → mostrar → confirmar → registrar → perguntar o
que vem agora.** Nada além disso. Não gere dashboard, não calcule estoque,
não faça análise de consumo aqui.

## Passo a passo

1. **Obtenha a imagem.** Se o usuário já anexou foto ou PDF, use. Senão,
   peça uma foto nítida mostrando o QR code E a lista de itens.

2. **Decodifique o QR code** com um script Python curto (`pip install
   pyzbar zxing-cpp --break-system-packages` se preciso; `opencv-python`
   serve de alternativa). O objetivo é extrair a URL codificada.

3. **Se decodificou a URL:** use as ferramentas MCP do Playwright pra
   navegar até ela. Páginas de NFC-e da SEFAZ são Angular/JS — espere o
   conteúdo popular antes de extrair. Pegue estabelecimento, CNPJ, data,
   itens (quantidade/unidade/preço) e total. Se não carregar em ~30s ou
   voltar conteúdo muito curto (<100 caracteres), trate como falha e vá
   pro passo 4.

4. **Fallback — leia a foto.** Você lê imagens nativamente: extraia os
   mesmos campos direto do cupom. Avise que é menos preciso (cupom térmico
   desbota) e peça atenção na conferência.

5. **Estruture o resultado**, independente do método:
   ```json
   {
     "estabelecimento": "nome da loja",
     "data_compra": "YYYY-MM-DD",
     "total": 0.00,
     "metodo": "qrcode | foto",
     "itens": [
       {"nome": "produto", "quantidade": 1.0, "unidade": "UN|KG|G|L|ML|CX|PCT", "preco_unitario": 0.00, "preco_total": 0.00}
     ]
   }
   ```
   Normalize nomes pra algo legível ("LEITE INTEG UHT 1L" → "Leite
   Integral 1L"). **Nunca invente preço ou quantidade**: campo ilegível
   vai como `null`.

6. **Mostre os itens em tabela compacta e peça confirmação** — uma vez só.
   Marque com `?` os itens que ficaram com campo `null`, pra ele corrigir
   se quiser.

7. **Registre** com a skill `despensa-dados` (evento `compra`). Se o
   usuário respondeu "registra", "pode salvar", "ok" ou equivalente,
   **registre tudo imediatamente**, incluindo os itens marcados com `?`
   (que entram com `null` + `obs`). Não repita a pergunta, não peça
   confirmação item a item — ele já decidiu. Mencione as pendências em uma
   linha **depois** de salvar.

8. **Feche perguntando o que vem agora**, em uma linha, sem enrolação:

   > Salvo — 12 itens, R$ 187,40, no seu Drive.
   > Quer **mandar outra nota**, **gerar a lista de compras** ou paramos por aqui?

   Se ele pedir a lista → skill `gerador-lista-compras`.
   Se ele mandar outra nota → recomece do passo 1.
   Se ele encerrar → encerre. Não ofereça mais nada.
