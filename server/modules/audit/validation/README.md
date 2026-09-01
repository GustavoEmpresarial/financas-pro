# validation — vazio de proposito

O modulo tem uma unica rota, `GET /api/audit/{table}/{recordId}`, e nao aceita
corpo. Os dois parametros vem da URL e sao usados como filtro em query
parametrizada, sem interpolacao.

**Quando preencher:** se a rota passar a aceitar filtros (intervalo de data,
tipo de acao) ou se a auditoria ganhar escrita via API.
