# store — vazio de proposito

Nao ha estado global de cliente. O estado do servidor fica no react-query, e o
que sobra (sessao e tema) vive em Context.

**Quando preencher:** se aparecer estado compartilhado que nao venha da API e
nao caiba em Context — um carrinho de importacao em varias etapas, filtros que
persistam entre telas. Ai entra um zustand ou equivalente.
