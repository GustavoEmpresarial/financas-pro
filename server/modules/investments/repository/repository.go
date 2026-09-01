// Package repository declara o acesso a dados de investments.
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
const Table = "investments"

// Columns e a allowlist de escrita.
//
// Nao inclui id, user_id, created_at, updated_at nem deleted_at: esses sao do
// servidor. Uma chave do request que nao esteja aqui e descartada — e o que
// substitui o stripProtected do legado.
var Columns = sqlbuilder.NewColumns(
	"name",
	"ticker",
	"type",
	"amount_invested",
	"current_value",
	"purchase_date",
	"category",
	"broker",
	"notes",
	"color",
)

// New devolve o repositorio CRUD ja ligado as queries geradas.
func New(pool *pgxpool.Pool) *crud.Repo[gen.Investment] {
	q := gen.New(pool)
	return crud.NewRepo(pool, crud.SQL[gen.Investment]{
		Table:   Table,
		Columns: Columns,
		List: func(ctx context.Context, userID string) ([]gen.Investment, error) {
			return q.ListInvestments(ctx, userID)
		},
		Get: func(ctx context.Context, id, userID string) (gen.Investment, error) {
			return q.GetInvestment(ctx, gen.GetInvestmentParams{ID: id, UserID: userID})
		},
		Delete: func(ctx context.Context, id, userID string) (int64, error) {
			return q.SoftDeleteInvestment(ctx, gen.SoftDeleteInvestmentParams{ID: id, UserID: userID})
		},
	})
}
