// Package repository declara o acesso a dados de financial_accounts.
//
// Nao ha logica aqui: a forma CRUD inteira vem de shared/crud. O que este
// arquivo faz e dizer QUAL tabela, QUAIS colunas o cliente pode escrever, e
// quais leituras tipadas do sqlc usar.
package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
	"financaspro/server/shared/crud"
	"financaspro/server/shared/sqlbuilder"
)

// Table e o nome da tabela no banco.
const Table = "financial_accounts"

// Columns e a allowlist de escrita.
//
// Nao inclui id, user_id, created_at, updated_at nem deleted_at: esses sao do
// servidor. Uma chave do request que nao esteja aqui e descartada — e o que
// substitui o stripProtected do legado.
var Columns = sqlbuilder.NewColumns(
	"name",
	"balance",
	"type",
	"bank",
	"color",
	"icon",
	"is_active",
	"notes",
)

// New devolve o repositorio CRUD ja ligado as queries geradas.
func New(pool *pgxpool.Pool) *crud.Repo[gen.FinancialAccount] {
	q := gen.New(pool)
	return crud.NewRepo(pool, crud.SQL[gen.FinancialAccount]{
		Table:   Table,
		Columns: Columns,
		List: func(ctx context.Context, userID string) ([]gen.FinancialAccount, error) {
			return q.ListAccounts(ctx, userID)
		},
		Get: func(ctx context.Context, id, userID string) (gen.FinancialAccount, error) {
			return q.GetAccount(ctx, gen.GetAccountParams{ID: id, UserID: userID})
		},
		Delete: func(ctx context.Context, id, userID string) (int64, error) {
			return q.SoftDeleteAccountAndDeactivate(ctx, gen.SoftDeleteAccountAndDeactivateParams{ID: id, UserID: userID})
		},
	})
}
