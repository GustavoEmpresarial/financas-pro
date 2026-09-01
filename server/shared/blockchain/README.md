# shared/blockchain — RESERVADO (vazio)

Sem uso hoje. O módulo `crypto` guarda posições manualmente: nome, símbolo,
quantidade, preço médio e preço atual são digitados pelo usuário — nada é lido
de uma chain.

**Quando preencher:** ler saldo on-chain a partir de um endereço de carteira,
ou puxar cotação de uma API externa (CoinGecko) para preencher `current_price`.

**O que entra aqui:** clients RPC/HTTP e a normalização de resposta. O módulo
`modules/crypto` consome isso pelo service, nunca pelo controller.
