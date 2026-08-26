---
name: captura-nota-fiscal
description: Captura nota fiscal brasileira ou NFC-e por QR code, página oficial ou foto do cupom e, após confirmação, registra a compra. Use quando pedirem para capturar, ler, escanear, processar ou salvar nota de supermercado ou farmácia.
---

# Captura de Nota Fiscal no Codex

Use leitura de imagem para QR/foto, navegador para a página oficial da Receita e MCP `listinIA` para gravar.

1. Se a pessoa não escolheu, pergunte se prefere QR code (mais exato) ou foto do cupom.
2. Leia cada imagem uma única vez. Se houver URL no QR, abra-a no navegador.
3. Campo ilegível vira pendência, nunca palpite. Pergunte se deve completar ou excluir o item.
4. Mostre os itens conferidos e pergunte se deve registrar ou só organizar.
5. Só após confirmação explícita, chame `nota_registrar` uma vez, com a chave NFC-e quando existir.
6. Depois de gravar, pare; não gere dashboard por conta própria.

Se falhar, peça outra foto focada no QR. Não monte URL à mão, substitua a fonte oficial por busca ou trate a imagem para forçar leitura. Na resposta, não exponha ferramentas, JSON ou detalhes internos.

