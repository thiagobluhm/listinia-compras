---
name: alerta-estoque-baixo
description: Analyzes the pantry spreadsheet for items likely to run out soon and offers to set up a recurring scheduled check that notifies the user. Use when the user asks to check what's running low, wants to be alerted about stock, "avisa quando algo tá acabando", or wants to set up recurring pantry monitoring.
---

# Alerta de Estoque Baixo

## Análise (sempre que chamada)

1. Leia a aba "Despensa" de `despensa.xlsx` — carregue a planilha real do
   lugar persistente (skill `despensa-xlsx`), nunca uma nova.
2. Liste os itens com status crítico ou baixo (mesma fórmula/limiares da
   skill `despensa-xlsx`), ordenados por Dias Restantes crescente.
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
   análise sobre `despensa.xlsx` e envia o resumo como notificação.
4. Confirme com o usuário o horário/dia exato antes de criar, e informe
   claramente depois de criada (nome da tarefa e quando ela roda).
