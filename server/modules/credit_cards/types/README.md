# credit_cards — vazio de proposito

Este modulo e CRUD puro: as quatro operacoes sao exatamente
`GET` / `POST` / `PUT :id` / `DELETE :id` sobre `credit_cards`, sem nenhuma regra
propria. O controller e o service que ele usa sao os genericos de
`server/shared/crud`.

Escrever aqui um controller que so repassa para o repositorio seria o mesmo
arquivo copiado em oito modulos — foi justamente isso que motivou o pacote
generico (ver o cabecalho de `server/shared/crud/crud.go`).

**Quando preencher:** na primeira regra que so valha para credit_cards. Aí este
modulo deixa de usar `crud.New` e passa a ter controller e service proprios,
como `auth`, `transactions`, `bills` e `subscriptions` ja tem. O repositorio e
as rotas continuam onde estao.
