# core/redis — RESERVADO (vazio)

Sem uso hoje. O backend legado (Fastify) nunca usou Redis e o app é de uso
pessoal, single-user: não há sessão distribuída, nem rate limit compartilhado,
nem cache quente que justifique mais um processo.

**Quando preencher:** se aparecer cache de cotações (crypto/investimentos) com
TTL, rate limit por IP, ou se `workers/queues` sair do papel — a fila provável
(asynq) roda sobre Redis.

**O que entra aqui:** o client (`redis.Client`), o healthcheck e os helpers de
key namespace. Nada de regra de negócio.
