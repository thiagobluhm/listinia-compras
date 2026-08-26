---
name: despensa-dados
description: Consulta e gerencia a despensa Listinia, registra compras confirmadas, ajusta ou remove produtos e exporta o estado atual. Use para estoque, correções, registro de nota conferida ou planilha.
---

# Gestão da Despensa

O servidor `listinIA` é a fonte única de verdade. Use `despensa_listar` ou `despensa_status` para consultas e preserve dias restantes, status e categoria como vierem.

- Compra inteira confirmada: `nota_registrar`, uma chamada por nota, com chave NFC-e quando existir.
- Correção manual: `produto_salvar` ou `produto_remover`.
- Nota errada: explique que `nota_remover` não desfaz o estoque somado e confirme os ajustes necessários.
- XLSX pedido: consulte o estado e use a capacidade de planilhas do Codex; explique que é uma fotografia do momento.

Qualquer escrita exige confirmação explícita. Não funda nomes parecidos, complete campos ausentes ou recalcule valores. Não exponha ferramenta, código ou JSON na resposta.

