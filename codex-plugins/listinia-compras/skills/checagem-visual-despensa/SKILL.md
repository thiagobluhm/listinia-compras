---
name: checagem-visual-despensa
description: Reconhece itens em fotos da geladeira ou despensa, cruza com o estoque Listinia e confirma antes de alterar dados. Use somente dentro da geração de lista quando houver fotos ou a pessoa aceitar enviá-las.
---

# Checagem Visual da Despensa

Leia cada foto uma única vez e anote somente itens claros. Depois chame `despensa_status`: registrado e visível confirma estoque; registrado, baixo e não visível é possível item acabado; visível e não registrado pode ser adicionado.

Ausência na foto nunca prova que acabou. Apresente como sugestão e confirme em bloco. Só depois use `produto_salvar` ou `produto_remover`. Foto ruim pede outra foto; não recorte, amplie, gire ou releia para forçar reconhecimento. Nunca rode esta skill fora de um pedido de lista.

