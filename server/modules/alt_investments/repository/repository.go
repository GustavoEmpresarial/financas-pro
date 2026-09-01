// Package repository acessa alt_investments e o sub-recurso de rendimentos.
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

const (
	Table         = "alt_investments"
	EarningsTable = "alt_investment_earnings"
)

var (
	Columns = sqlbuilder.NewColumns(
		"name", "type", "invested_amount", "current_value", "purchase_date",
		"maturity_date", "expected_return", "risk_level", "platform", "notes",
		"logo_url", "is_active",
	)
	// investment_id nao esta aqui: vem da URL, nao do corpo. Deixar o cliente
	// escolher permitiria pendurar um rendimento no investimento de outro dono.
	EarningColumns = sqlbuilder.NewColumns("amount", "type", "date", "notes")
)

// Base devolve o repositorio CRUD do investimento em si.
func Base(pool *pgxpool.Pool) *crud.Repo[gen.AltInvestment] {
	q := gen.New(pool)
	return crud.NewRepo(pool, crud.SQL[gen.AltInvestment]{
		Table:   Table,
		Columns: Columns,
		List: func(ctx context.Context, userID string) ([]gen.AltInvestment, error) {
			return q.ListAltInvestments(ctx, userID)
		},
		Get: func(ctx context.Context, id, userID string) (gen.AltInvestment, error) {
			return q.GetAltInvestment(ctx, gen.GetAltInvestmentParams{ID: id, UserID: userID})
		},
		Delete: func(ctx context.Context, id, userID string) (int64, error) {
			return q.SoftDeleteAltInvestment(ctx, gen.SoftDeleteAltInvestmentParams{ID: id, UserID: userID})
		},
	})
}

// Earnings acessa o sub-recurso.
type Earnings struct {
	pool *pgxpool.Pool
	q    *gen.Queries
}

func NewEarnings(pool *pgxpool.Pool) *Earnings {
	return &Earnings{pool: pool, q: gen.New(pool)}
}

func (e *Earnings) List(ctx context.Context, investmentID, userID string) ([]gen.AltInvestmentEarning, error) {
	return e.q.ListAltInvestmentEarnings(ctx, gen.ListAltInvestmentEarningsParams{
		InvestmentID: investmentID,
		UserID:       userID,
	})
}

// Create grava um rendimento, conferindo antes que o investimento e do usuario.
func (e *Earnings) Create(ctx context.Context, investmentID, userID string, body crud.Body) (gen.AltInvestmentEarning, error) {
	var zero gen.AltInvestmentEarning

	// Sem essa checagem, um id de investimento alheio na URL criaria um
	// rendimento apontando para ele. O legado nao verificava.
	if _, err := e.q.GetAltInvestment(ctx, gen.GetAltInvestmentParams{ID: investmentID, UserID: userID}); err != nil {
		return zero, apperrors.ErrNotFound
	}

	patch := sqlbuilder.NewPatch(body, EarningColumns, utils.CamelToSnake).
		Set("id", uuid.NewString()).
		Set("user_id", userID).
		Set("investment_id", investmentID)

	query, args, err := patch.Insert(EarningsTable)
	if err != nil {
		return zero, err
	}
	var id string
	if err := e.pool.QueryRow(ctx, query, args...).Scan(&id); err != nil {
		return zero, err
	}
	return e.q.GetAltInvestmentEarning(ctx, gen.GetAltInvestmentEarningParams{ID: id, UserID: userID})
}
