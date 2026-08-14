---
name: alerta-estoque-baixo
description: Analyzes the pantry spreadsheet for items likely to run out soon and offers to set up a recurring scheduled check that notifies the user. Use when the user asks to check what's running low, wants to be alerted about stock, "avisa quando algo tá acabando", or wants to set up recurring pantry monitoring.
---

# Alerta de Estoque Baixo

## Análise (sempre que chamada)

1. Carregue o `despensa.jsonl` real (skill `despensa-dados`, nunca um
   novo) e calcule o estado atual.
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
   Isso só funciona de forma confiável se os dados estiverem na Camada 1
   (Google Drive) — sem Drive conectado, não há como uma tarefa agendada
   (que roda numa sessão nova, sem anexos) acessar os dados. Avise isso
   se o usuário estiver na Camada 2 ou 3.
4. Confirme com o usuário o horário/dia exato antes de criar, e informe
   claramente depois de criada (nome da tarefa e quando ela roda).
