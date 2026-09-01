# Anatomia de um módulo

Todo módulo vive em `server/modules/<nome>/` e é montado por `module.go`, que
recebe as dependências prontas e não conhece HTTP nem SQL.

## Módulo CRUD (a maioria)

Doze módulos não têm regra própria. Eles declaram três coisas e reaproveitam
`server/shared/crud`:

```
<nome>/
├── repository/repository.go   tabela, allowlist de colunas, 3 queries do sqlc
├── validation/validation.go   Create e Update
├── routes/routes.go           uma linha: crud.Mount
├── module.go                  liga as três
├── controller/README.md       vazio: usa o controller genérico
├── service/README.md          vazio: não há regra
└── types/README.md            vazio: o corpo é crud.Body
```

O repositório é quase todo declaração:

```go
const Table = "financial_goals"

// Não inclui id, user_id, created_at, updated_at, deleted_at: esses são do
// servidor. Chave fora desta lista é descartada.
var Columns = sqlbuilder.NewColumns("name", "target_amount", /* … */)

func New(pool *pgxpool.Pool) *crud.Repo[gen.FinancialGoal] {
	q := gen.New(pool)
	return crud.NewRepo(pool, crud.SQL[gen.FinancialGoal]{
		Table:   Table,
		Columns: Columns,
		List:    func(ctx context.Context, userID string) ([]gen.FinancialGoal, error) { … },
		Get:     func(ctx context.Context, id, userID string) (gen.FinancialGoal, error) { … },
		Delete:  func(ctx context.Context, id, userID string) (int64, error) { … },
	})
}
```

## Módulo com regra

`auth`, `transactions`, `bills`, `subscriptions`, `earnings`, `transfers` e
`upload` têm `controller/` e `service/` de verdade, e DTOs tipados em `types/`
em vez de `crud.Body`.

Alguns deles não têm `repository/`: quando a operação escreve em várias tabelas
na mesma transação de banco, separar em repositórios obrigaria a passar o
`pgx.Tx` entre eles, o que não esconde nada e deixa ambíguo quem faz o commit.
Nesses casos o `README.md` da pasta explica a escolha.

## Regras que valem para todos

- **O dono sai do `context`**, via `middleware.UserID(ctx)`. Nenhuma query
  recebe `user_id` por parâmetro vindo do request.
- **Todo `WHERE` de escrita carrega `user_id` e `deleted_at IS NULL`.**
- **Exclusão é lógica.**
- **Resposta sai por `core/http/responses`.** Nenhum handler monta JSON na mão.
- **Erro sai por `responses.Error`**, que resolve o status. Erro 5xx vai para o
  log com a causa; o cliente recebe só a mensagem genérica.

## Adicionar um módulo

1. Escreva as queries em `server/core/database/queries/<nome>.sql` e rode
   `make sqlc`.
2. Copie a forma de `server/modules/goals/`.
3. Registre em `server/bootstrap/routes.go`, dentro do grupo autenticado.
4. Documente as rotas em `docs/api/contrato.md`.
5. Cubra as invariantes em `tests/integration/`.
