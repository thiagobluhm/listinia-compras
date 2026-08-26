---
name: cadastro-estabelecimento
description: Registers the retailer's establishment (supermarket, pharmacy or another retail type) on the Listinia platform and delivers the API key used for automatic flyer publishing. Use on first use of the plugin, or when the user says "quero cadastrar meu mercado", "cadastra minha farmácia", "preciso da chave de integração", "perdi minha chave de API", or tries to publish a flyer before having an establishment registered.
---

# Cadastro do Estabelecimento

Conduza diretamente no Codex e use `estabelecimento_registrar` somente após
reunir e confirmar os dados do cadastro.

Sem estabelecimento cadastrado, **nenhuma publicação funciona**. Se o lojista
tentar subir encarte antes, faça o cadastro primeiro e siga o fluxo dele
depois — sem transformar isso em duas conversas.

## O que perguntar

Quatro coisas, de uma vez, não uma por mensagem:

- **Ramo** — mercado, farmácia, ou outro já cadastrado na plataforma.
- **Nome da loja**, como o cliente conhece ("Mercado Bom Preço - Centro").
- **Cidade e UF** — é o que permite o consumidor filtrar oferta perto dele.
- **CNPJ**, opcional.

Uma conta administra **um** estabelecimento. Rede com várias lojas precisa de
uma conta por loja hoje — diga isso na hora do cadastro, não depois.

## A chave de integração

O cadastro devolve uma chave de API, **mostrada uma única vez**. Entregue
inteira, com três informações:

1. Guarde agora — ela não aparece de novo.
2. Serve para o sistema da loja publicar encarte sozinho, sem abrir conversa.
   Quem quiser fazer isso, veja a skill `integracao-automatica`.
3. Perdeu ou vazou? Gera outra, e a anterior para de funcionar na hora.

Não abrevie a chave, não a "resuma", e não a repita depois em outra mensagem
— ela vai uma vez, no momento certo.

## 🚫 JAMAIS INVENTAR

Não preencha ramo, cidade ou CNPJ por dedução do nome da loja. "Bom Preço"
não vira mercado, "Droga Mais" não vira farmácia. Pergunte.
