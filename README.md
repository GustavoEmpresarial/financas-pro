# FinançasPro

App de finanças pessoais: transações, contas, cartões, contas a pagar,
investimentos, assinaturas e metas.

**Backend em Go** (chi + pgx + sqlc + goose) servindo uma **SPA React**
(Vite + shadcn/ui + react-query) sobre **Postgres**. Deploy é um binário
estático — não há Node em runtime.

O backend anterior, em Fastify + Prisma, foi removido; o motivo da migração
está em `docs/decisions/0001-backend-em-go.md`.

## Rodar

**Tudo de uma vez (Docker):**

```sh
cp .env.example .env      # e defina JWT_SECRET
docker compose up --build -d
```

App em http://localhost:9000. As migrações são aplicadas no boot.

**Desenvolvimento**, com backend e frontend separados:

```sh
# 1. banco
docker compose up -d postgres

# 2. migrações
export DATABASE_URL=postgresql://financaspro:financaspro123@localhost:5432/financaspro
make migrate

# 3. API na 9101
make dev

# 4. client na 8080, com proxy de /api e /uploads para a 9101
make client-install && make client-dev
```

`make help` lista o resto.

## Estrutura

```
server/     backend Go
  bootstrap/  monta dependências, rotas e o servidor HTTP
  core/       config, banco, logger, middleware, envelope de resposta e erro
  modules/    um pacote por domínio, na fatia controller → service → repository
  shared/     o que atravessa módulos: JWT, bcrypt, datas, saldo, CRUD genérico
client/     SPA React, organizada por feature
migrations/ SQL versionado (goose)
docs/        arquitetura, contrato da API, decisões
tests/       testes que precisam de banco
```

Pastas reservadas para uso futuro (`server/core/redis`, `server/workers`,
`server/cron`, `client/src/i18n`, `nginx/`) trazem um `README.md` explicando
para que servem e o que dispararia o uso. Elas estão vazias de propósito.

## Testes

```sh
make test              # unidade, sem banco
make test-integration  # sobe um Postgres descartável e roda contra a API real
make client-test       # vitest
make lint              # go vet + gofmt
```

## Como o backend está organizado

Todo request entra por `server/bootstrap/routes.go`. `/api/*` passa por
recuperação de panic, log, CORS e normalização do corpo; tudo exceto
`/api/auth/register` e `/api/auth/login` exige `Authorization: Bearer`.

O dono do request vive no `context`, e os repositórios o leem de lá — nenhuma
query recebe `user_id` por parâmetro, para que esquecer o filtro por dono não
seja possível por descuido.

Doze dos dezoito módulos são CRUD puro e usam o controller genérico de
`server/shared/crud`; cada um declara só a tabela, a allowlist de colunas
graváveis e três queries do sqlc. Os demais (`auth`, `transactions`, `bills`,
`subscriptions`, `earnings`, `transfers`, `upload`) têm service próprio.

Detalhes em `docs/architecture/` e o contrato completo em `docs/api/`.
