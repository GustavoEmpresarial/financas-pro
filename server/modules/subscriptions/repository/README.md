# repository — vazio de proposito

Cobrar uma assinatura escreve em tres tabelas na mesma transacao de banco:
`transactions`, `subscription_charges` e `recurring_subscriptions`. Repartir
isso em repositorios obrigaria a passar o `pgx.Tx` entre eles, o que nao
esconde nada e deixa ambiguo quem faz o commit.

O acesso a dados esta em `service/service.go`, usando as queries tipadas do
sqlc (`server/core/database/gen`).

**Quando preencher:** se o service crescer a ponto de as queries poderem ser
agrupadas sem quebrar a transacao.
