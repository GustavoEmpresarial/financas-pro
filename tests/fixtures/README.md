# fixtures — vazio de proposito

Os testes de integracao criam os proprios dados pela API (ver `newUser` e
`createID` em `../integration/main_test.go`). Isso mantem cada teste legivel de
cima a baixo e garante que ele exercita o mesmo caminho que o app usa.

**Quando preencher:** quando algum cenario precisar de massa grande demais para
montar em codigo — um CSV de importacao de exemplo, ou um dump com historico de
varios meses para testar relatorio.
