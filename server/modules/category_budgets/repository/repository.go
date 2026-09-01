// Package repository acessa category_budgets.
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
	"financaspro/server/shared/crud"
	apperrors "financaspro/server/shared/errors"
	"financaspro/server/shared/sqlbuilder"
	"financaspro/server/shared/utils"
)

const Table = "category_budgets"

// Columns: o orcamento e um vinculo simples entre categoria, mes e valor.
var Columns = sqlbuilder.NewColumns("category_id", "month", "amount")

type Repository struct {
	pool *pgxpool.Pool
	q    *gen.Queries
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, q: gen.New(pool)}
}

// List aceita mes opcional; nil devolve todos.
func (r *Repository) List(ctx context.Context, userID string, month *string) ([]gen.ListCategoryBudgetsRow, error) {
	return r.q.ListCategoryBudgets(ctx, gen.ListCategoryBudgetsParams{UserID: userID, Month: month})
}

func (r *Repository) Create(ctx context.Context, userID string, body crud.Body) (gen.GetCategoryBudgetRow, error) {
	patch := sqlbuilder.NewPatch(body, Columns, utils.CamelToSnake).
		Set("id", uuid.NewString()).
		Set("user_id", userID)

	query, args, err := patch.Insert(Table)
	if err != nil {
		return gen.GetCategoryBudgetRow{}, err
	}
	var id string
	if err := r.pool.QueryRow(ctx, query, args...).Scan(&id); err != nil {
		return gen.GetCategoryBudgetRow{}, err
	}
	return r.q.GetCategoryBudget(ctx, gen.GetCategoryBudgetParams{ID: id, UserID: userID})
}

func (r *Repository) SoftDelete(ctx context.Context, id, userID string) error {
	rows, err := r.q.SoftDeleteCategoryBudget(ctx, gen.SoftDeleteCategoryBudgetParams{ID: id, UserID: userID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperrors.ErrNotFound
	}
	return nil
}
