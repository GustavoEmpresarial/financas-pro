# workers/processors — RESERVADO (vazio)

Sem uso hoje. Par de `workers/queues`: aqui ficam os consumidores.

**Quando preencher:** junto com `workers/queues`.

**O que entra aqui:** um processor por tipo de job, cada um chamando o service
do módulo correspondente. Nenhum processor fala com o banco direto.
