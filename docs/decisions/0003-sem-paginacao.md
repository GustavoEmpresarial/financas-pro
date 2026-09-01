# 0003 — Sem paginacao nas listagens

**Data:** 2026-09-01 · **Status:** aceito

## Contexto
Nenhum endpoint de listagem do backend legado pagina: todos fazem `findMany`
sem `take`/`skip`. A unica excecao e `GET /api/audit/:table/:recordId`, com
`LIMIT 100` fixo.

## Decisao
Manter. O backend Go devolve a colecao inteira, como antes.

## Por que
- **O contrato nao pode mudar.** Os hooks de react-query em `client/src/features`
  esperam um array em `{data: [...]}`. Envelope paginado quebraria todas as telas.
- E um app pessoal de um usuario so. `transactions` e a maior tabela e cresce na
  ordem de algumas centenas de linhas por ano.

## Gatilho para revisar
`SELECT count(*) FROM transactions` passar de ~20 mil, ou a tela de transacoes
levar mais de 300ms para pintar. A mudanca envolve backend **e** frontend ao
mesmo tempo — nao da para fazer so de um lado.
