---
name: alerta-estoque-baixo
description: Verifica itens críticos ou baixos no Listinia e, quando solicitado, cria monitoramento recorrente no Codex. Use para estoque baixo, alertas ou acompanhamento periódico.
---

# Alerta de Estoque Baixo

Chame `despensa_status` e liste itens críticos ou baixos por dias restantes crescente, sem recalcular. Se não houver, diga que está tudo tranquilo.

Crie automação somente se pedirem. Confirme frequência, dia, horário e fuso. A automação recorrente do Codex deve consultar novamente o servidor e só notificar quando houver item crítico ou baixo. Depois diga o nome e o próximo horário. Ajustes exigem confirmação antes de `produto_salvar` ou `produto_remover`.

