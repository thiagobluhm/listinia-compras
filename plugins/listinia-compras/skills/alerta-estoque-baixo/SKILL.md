---
name: alerta-estoque-baixo
description: Checks the listinIA pantry for items likely to run out soon and offers to set up a recurring scheduled check that notifies the user. Use when the user asks to check what's running low, wants to be alerted about stock, "avisa quando algo tá acabando", or wants to set up recurring pantry monitoring.
---

# Alerta de Estoque Baixo

## A checagem

Chame `despensa_status` (ou delegue ao `listinia-despensor` se o pedido
vier junto com um ajuste). Liste os itens com status **crítico** ou
**baixo**, ordenados por dias restantes crescente.

Responda em texto curto e direto: quais itens, quantos dias restam. Sem
tabela extensa, a menos que peçam.

Os números vêm calculados do servidor — **use como vieram, nunca
recalcule.**

## Monitoramento recorrente

Só se a pessoa pedir. **Nunca crie uma tarefa recorrente por conta
própria.**

1. Explique que dá para rodar essa checagem automaticamente num intervalo
   (ex.: toda segunda de manhã) e que você manda um resumo quando algo
   estiver crítico ou baixo.
2. Pergunte a frequência. Semanal é o mais comum, já que a maioria vai ao
   mercado a cada 7 dias.
3. Confirme dia e horário exatos **antes** de criar.
4. Crie a tarefa com as ferramentas de tarefa agendada do Cowork
   (`create_trigger`), com um prompt que refaz esta mesma checagem no
   servidor listinIA e envia o resumo como notificação.
5. Diga depois, em uma linha, o nome da tarefa e quando ela roda.

Como a despensa vive no servidor, a tarefa agendada funciona normalmente
numa sessão nova — não depende de anexo nem de pasta conectada. O que ela
precisa é do servidor listinIA conectado na conta.

## 🚫 JAMAIS INVENTAR

Item que não está na despensa não aparece no alerta. Se não houver nada
crítico ou baixo, a resposta é "está tudo tranquilo" — não uma lista
preventiva de sugestões.

## 🗣️ Como falar

Sem nome de ferramenta, de agente ou de arquivo. Duas ou três linhas.
