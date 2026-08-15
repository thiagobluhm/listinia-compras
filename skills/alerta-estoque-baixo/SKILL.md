---
name: alerta-estoque-baixo
description: Analyzes the pantry spreadsheet for items likely to run out soon and offers to set up a recurring scheduled check that notifies the user. Use when the user asks to check what's running low, wants to be alerted about stock, "avisa quando algo tá acabando", or wants to set up recurring pantry monitoring.
---

# Alerta de Estoque Baixo

## 🗣️ Como falar (regra que vale para tudo abaixo)

Quem usa este plugin é uma pessoa comum organizando as compras de casa —
não um programador. A conversa tem que parecer um assistente prestativo,
nunca um terminal.

**Nunca escreva na resposta:** nome de ferramenta, ID de arquivo, trecho de
código, JSON, "JSONL", "base64", "camada", nome técnico de arquivo, ou
explicação de como você funciona por dentro.

**Fale assim:** "sua despensa", "sua lista de compras", "salvei no seu
Google Drive", "não consegui salvar agora".

**Se der problema:** resolva sozinho. Se realmente não der, diga em UMA
frase simples o que houve e o que você já vai fazer a respeito — nunca
peça um código ou ID ao usuário, nunca ofereça opções técnicas, nunca
liste as ferramentas que você tem. Ele não tem como responder isso e só
vai se sentir perdido.

**Seja curto.** Duas ou três linhas por resposta bastam, sem relatório do
que você fez por dentro.

## Análise (sempre que chamada)

1. Carregue o estado real da despensa (skill `despensa-dados`, nunca
   comece do zero).
2. Liste os itens com status crítico ou baixo (mesma fórmula/limiares da
   skill `despensa-dados`), ordenados por Dias Restantes crescente.
3. Responda em texto curto e direto: quais itens, há quantos dias restam,
   sem tabela extensa a menos que o usuário peça.

## Oferecer monitoramento recorrente

Se o usuário pedir para ser avisado automaticamente (não crie isso por
conta própria, sempre com confirmação explícita — nunca configure uma
tarefa recorrente sem o usuário pedir):

1. Explique que dá pra rodar essa checagem automaticamente em um intervalo
   (ex.: toda segunda-feira de manhã) e que, quando encontrar algo crítico
   ou baixo, você manda uma notificação com o resumo.
2. Pergunte a frequência desejada (semanal é o padrão mais comum, dado que
   a maioria dos usuários compra a cada 7 dias).
3. Crie a tarefa agendada usando as ferramentas de scheduled task do
   Cowork (`create_trigger`), com um prompt que reexecuta esta mesma
   análise sobre o `despensa.jsonl` e envia o resumo como notificação.
   Isso só funciona de forma confiável com o Google Drive conectado — uma
   tarefa agendada roda numa sessão nova, sem anexos, então sem Drive ela
   não tem como acessar os dados. Avise se for o caso.
4. Confirme com o usuário o horário/dia exato antes de criar, e informe
   claramente depois de criada (nome da tarefa e quando ela roda).
