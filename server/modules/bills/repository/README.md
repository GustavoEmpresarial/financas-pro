# repository — vazio de proposito

O `split` de uma conta cria N parcelas e apaga a original na mesma transacao de
banco. Uma camada de repositorio separada teria de receber o `pgx.Tx` de fora
para participar dessa transacao, o que nao esconde nada e deixa o dono do
commit ambiguo.

O acesso a dados esta em `service/service.go`, usando as queries tipadas do sqlc
(`server/core/database/gen`).

**Quando preencher:** se o service crescer a ponto de as queries poderem ser
agrupadas sem quebrar a transacao.
