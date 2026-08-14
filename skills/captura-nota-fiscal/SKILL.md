---
name: captura-nota-fiscal
description: Captures a Brazilian grocery or pharmacy receipt (nota fiscal / NFC-e), reading its QR code and scraping the official SEFAZ page via Playwright to get the itemized purchase, falling back to reading the photo directly when the QR code isn't legible. Use when the user says things like "captura essa nota", "lê essa nota fiscal", "escaneia esse cupom", "processa essa nota de compra", "joga essa nota na despensa", or attaches a photo/PDF of a supermarket or pharmacy receipt.
---

# Captura de Nota Fiscal (QR + Playwright, fallback foto)

Este pipeline é o mesmo usado em produção no app Listinia real do usuário
(`sefaz_scraper.py` + `qrcode_reader.py`) — siga os mesmos passos e a mesma
ordem de prioridade: QR code primeiro (mais preciso e mais barato), foto
como fallback.

## Passo a passo

1. **Obtenha a imagem.** Se o usuário já anexou uma foto ou PDF da nota, use-a.
   Caso contrário, peça uma foto nítida que mostre o QR code E a lista de itens.

2. **Decodifique o QR code.** Rode um script Python curto para ler o QR code
   da imagem (instale `pyzbar` ou `zxing-cpp` via pip se não estiverem
   disponíveis: `pip install pyzbar zxing-cpp --break-system-packages`).
   Se preferir, tente `qrcode`/`opencv-python` como alternativa — o objetivo
   é extrair a URL de texto codificada no QR (deve começar com `http`).

3. **Se a URL foi decodificada com sucesso:**
   - Use as ferramentas MCP do Playwright (`playwright`) para navegar até a URL.
   - Aguarde a página carregar completamente — páginas de NFC-e da SEFAZ são
     Angular/JS e populam o conteúdo depois do load inicial, então espere o
     texto do corpo estabilizar antes de extrair.
   - Extraia o texto visível da página (nome do estabelecimento, CNPJ, data,
     lista de itens com quantidade/unidade/preço, total).
   - Se a página não carregar em ~30s ou retornar conteúdo muito curto
     (menos de ~100 caracteres), trate como falha e caia no fallback do
     passo 4.

4. **Fallback — leia a foto diretamente.** Se o QR não foi legível ou o
   scraping da SEFAZ falhou, você já consegue ler imagens nativamente: olhe
   a foto da nota e extraia os mesmos campos diretamente do papel impresso.
   Avise o usuário que este método é menos preciso (letras apagadas, cupom
   fiscal térmico desbotado) e peça para conferir os valores com atenção.

5. **Estruture o resultado** neste formato, independente do método usado:
   ```json
   {
     "estabelecimento": "nome da loja/supermercado",
     "data_compra": "YYYY-MM-DD",
     "total": 0.00,
     "metodo": "qrcode | foto",
     "itens": [
       {"nome": "nome do produto", "quantidade": 1.0, "unidade": "UN|KG|G|L|ML|CX|PCT", "preco_unitario": 0.00, "preco_total": 0.00}
     ]
   }
   ```
   Normalize nomes de produto para algo legível (ex: "LEITE INTEG UHT 1L" →
   "Leite Integral 1L"). Nunca invente preços ou quantidades que não estão
   na nota — se um campo não aparece, deixe null e avise o usuário.

6. **Mostre os itens extraídos ao usuário em uma tabela compacta e peça
   confirmação** antes de salvar qualquer coisa — igual ao app real, que
   sempre passa por uma tela de revisão antes de gravar na despensa. Deixe
   fácil corrigir nome, categoria, quantidade ou preço de qualquer item.

7. **Após a confirmação**, use a skill `despensa-xlsx` para registrar a
   compra e atualizar o estoque, e depois a skill `dashboard-despensa` para
   atualizar o dashboard com os novos dados. A skill `despensa-xlsx` sabe
   onde a planilha real do usuário mora (ou vai perguntar, na primeira
   vez) — nunca escreva direto num `despensa.xlsx` novo aqui, sempre passe
   por ela.
