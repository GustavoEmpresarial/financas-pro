// Package repository acessa earnings, mantendo o saldo da conta em dia.
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
	"financaspro/server/shared/crud"
	apperrors "financaspro/server/shared/errors"
	"financaspro/server/shared/ledger"
	"financaspro/server/shared/sqlbuilder"
	"financaspro/server/shared/utils"
)

const Table = "earnings"

// Columns replica a lista EARNING_FIELDS do legado
// (modules/earnings/routes.ts), que ja era uma allowlist explicita.
var Columns = sqlbuilder.NewColumns(
	"source_name", "amount", "currency", "date", "description",
	"category", "is_fixed", "account_id", "notes",
)

type Repository struct {
	pool *pgxpool.Pool
	q    *gen.Queries
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, q: gen.New(pool)}
}

func (r *Repository) List(ctx context.Context, userID string, month *string) ([]gen.Earning, error) {
	return r.q.ListEarnings(ctx, gen.ListEarningsParams{UserID: userID, Month: month})
}

// Todo caminho que mexe em ganho tambem mexe no saldo da conta. No legado eram
// UPDATEs soltos: uma falha no meio deixava o saldo divergente do extrato, sem
// erro visivel. Por isso Create, Update e SoftDelete abrem transacao.

func (r *Repository) Create(ctx context.Context, userID string, body crud.Body) (gen.Earning, error) {
	var out gen.Earning

	patch := sqlbuilder.NewPatch(body, Columns, utils.CamelToSnake).
		Set("id", uuid.NewString()).
		Set("user_id", userID)
	query, args, err := patch.Insert(Table)
	if err != nil {
		return out, err
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	qtx := r.q.WithTx(tx)

	var id string
	if err := tx.QueryRow(ctx, query, args...).Scan(&id); err != nil {
		return out, err
	}
	created, err := qtx.GetEarning(ctx, gen.GetEarningParams{ID: id, UserID: userID})
	if err != nil {
		return out, err
	}
	// Ganho sempre credita a conta, se houver conta.
	if err := ledger.Apply(ctx, qtx, created.AccountID, userID, created.Amount); err != nil {
		return out, err
	}
	if err := tx.Commit(ctx); err != nil {
		return out, err
	}
	return created, nil
}

func (r *Repository) Update(ctx context.Context, id, userID string, body crud.Body) error {
	patch := sqlbuilder.NewPatch(body, Columns, utils.CamelToSnake)
	query, args, err := patch.UpdateOwned(Table, id, userID)
	if err != nil {
		return err
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	qtx := r.q.WithTx(tx)

	old, err := qtx.GetEarning(ctx, gen.GetEarningParams{ID: id, UserID: userID})
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.ErrNotFound
		}
		return err
	}
	// Tira o efeito antigo antes de gravar, para o saldo refletir o novo valor
	// (e a nova conta, se ela mudou).
	if err := ledger.Apply(ctx, qtx, old.AccountID, userID, -old.Amount); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, query, args...); err != nil {
		return err
	}
	updated, err := qtx.GetEarning(ctx, gen.GetEarningParams{ID: id, UserID: userID})
	if err != nil {
		return err
	}
	if err := ledger.Apply(ctx, qtx, updated.AccountID, userID, updated.Amount); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repository) SoftDelete(ctx context.Context, id, userID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	qtx := r.q.WithTx(tx)

	old, err := qtx.GetEarning(ctx, gen.GetEarningParams{ID: id, UserID: userID})
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.ErrNotFound
		}
		return err
	}
	if err := ledger.Apply(ctx, qtx, old.AccountID, userID, -old.Amount); err != nil {
		return err
	}
	rows, err := qtx.SoftDeleteEarning(ctx, gen.SoftDeleteEarningParams{ID: id, UserID: userID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperrors.ErrNotFound
	}
	return tx.Commit(ctx)
}
