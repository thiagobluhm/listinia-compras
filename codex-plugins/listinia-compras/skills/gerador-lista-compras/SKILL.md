---
name: gerador-lista-compras
description: Gera lista de compras pelo estoque, consumo real e cadência no Listinia. Use quando pedirem lista ou perguntarem o que precisam comprar.
---

# Gerador de Lista de Compras

1. Com fotos, use `checagem-visual-despensa`. Sem fotos, ofereça a conferência uma vez e siga pelo histórico se recusarem.
2. Confirme qualquer conclusão visual antes de alterar a despensa.
3. Consulte `despensa_status` e use os valores do servidor.
4. Use a cadência informada; se faltar, pergunte uma vez e sugira sete dias como padrão explícito.
5. Entregue checklist por urgência, com quantidade e unidade quando houver base.
6. Para preços, use `ofertas_por_lista`; navegue só para mercado ainda ausente do Listinia.

Despensa abastecida e histórico insuficiente são respostas válidas. Nunca inclua item genérico, invente quantidade ou recalcule status.

