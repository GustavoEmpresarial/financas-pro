# 0001 — Backend em Go (chi + pgx + sqlc + goose)

**Data:** 2026-09-01 · **Status:** aceito

## Contexto
O backend era Fastify 5 + Prisma 6 sobre Postgres: 1.077 linhas de TypeScript,
18 modulos, sem Redis, sem fila, sem cron, sem websocket. Rodava em producao com
`tsx` (transpilando em runtime) e precisava de `node_modules` + `prisma generate`
na imagem final.

## Decisao
Reescrever o backend em Go 1.27, mantendo o frontend React como esta.

- **chi** — roteador em cima de `net/http`, sem framework proprio;
- **pgx/v5** — driver Postgres nativo, com pool;
- **sqlc** — SQL escrito a mao vira funcao tipada em Go; sem ORM, sem surpresa
  de N+1, o SQL que roda e o SQL que esta no arquivo;
- **goose** — migracoes versionadas em `.sql`, substituindo `prisma db push`.

## Por que
- O deploy passa a ser **um binario estatico**: sem Node, sem `node_modules`,
  sem `prisma generate` em runtime.
- O legado nao usava nada do Prisma alem de CRUD simples — o custo do ORM nao
  se pagava.
- `db push` nao deixava historico de schema. Com goose, cada mudanca de banco
  vira um arquivo revisavel.

## Consequencias
- Update parcial (`PUT` com subconjunto de campos) deixa de ser automatico:
  cada query de update usa `COALESCE($n, coluna)` e recebe ponteiro nulo para
  "nao mexer". Mais verboso, e explicito.
- Nao ha migracao automatica de schema: mudou coluna, escreve migracao.
- **O contrato HTTP nao muda.** O frontend nao sabe que o backend trocou.

## O que reverteria
Nada previsivel. Se o app virasse multiusuario com regras de permissao
complexas, valeria reavaliar o repositorio manual — mas nao a escolha de Go.
