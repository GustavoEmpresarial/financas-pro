# repository — vazio de proposito

As transacoes nao tem uma camada de repositorio separada: quase toda operacao
aqui abre uma transacao de banco e mistura escrita na tabela `transactions` com
ajuste de saldo em `financial_accounts`. Separar isso em "repositorio de
transacoes" e "repositorio de contas" obrigaria a passar o `pgx.Tx` de um para o
outro, o que nao esconde nada e deixa o controle da transacao ambiguo.

O acesso a dados esta em `service/service.go`, usando diretamente as queries
tipadas do sqlc (`server/core/database/gen`).

**Quando preencher:** se o service passar de ~400 linhas e as queries puderem
ser agrupadas sem quebrar a transacao de banco.
