# workers/queues — RESERVADO (vazio)

Sem uso hoje. Nada no app é assíncrono: cobrança de assinatura é disparada
manualmente por `POST /api/subscriptions/charge/:id`.

**Quando preencher:** envio de e-mail/notificação de vencimento, importação de
CSV grande sem travar o request, ou recálculo pesado de analytics.

**O que entra aqui:** a definição das filas e o enqueue. Depende de
`core/redis`, que também está reservado.
