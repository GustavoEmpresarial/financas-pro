# cron/jobs — RESERVADO (vazio)

Sem uso hoje, mas é a pasta com o candidato mais óbvio de todas.

**Quando preencher:** cobrança automática de assinaturas. Hoje
`recurring_subscriptions` tem `next_billing_date` e `billing_day`, mas nada
avança essas datas sozinho — o usuário precisa clicar. Um job diário que varre
assinaturas vencidas e chama o mesmo service de `POST /charge/:id` resolveria.
Segundo candidato: marcar `bills` vencidas como atrasadas.

**O que entra aqui:** o agendamento (`robfig/cron` ou um ticker + `context`) e a
chamada ao service. A regra de negócio continua em `modules/subscriptions/service`.
