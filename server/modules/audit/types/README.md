# types — vazio de proposito

Este modulo nao define DTOs proprios: o corpo do request chega como
`crud.Body` (um mapa filtrado pela allowlist de colunas do repositorio) e a
resposta e o modelo tipado que o sqlc gera em
`server/core/database/gen`.

Escrever structs aqui so para espelhar o que o sqlc ja gera criaria duas
definicoes da mesma coisa, com risco de divergirem.

**Quando preencher:** quando a entrada deixar de ser um espelho da tabela — um
corpo com campo que nao e coluna, uma resposta que combine tabelas, ou uma
projecao que precise esconder campo. `server/modules/auth/types` faz isso
para nao deixar `password_hash` sair numa resposta.
