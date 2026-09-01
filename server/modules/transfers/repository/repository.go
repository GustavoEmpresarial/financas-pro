// Package repository acessa account_transfers e move o saldo das contas.
package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/modules/transfers/types"
	"financaspro/server/shared/dates"
	apperrors "financaspro/server/shared/errors"
	"financaspro/server/shared/ledger"
)

type Repository struct {
	pool *pgxpool.Pool
	q    *gen.Queries
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, q: gen.New(pool)}
}

func (r *Repository) List(ctx context.Context, userID string) ([]gen.ListTransfersRow, error) {
	return r.q.ListTransfers(ctx, userID)
}

// Create debita a origem (valor + taxa), credita o destino (valor) e grava a
// transferencia — tudo numa transacao.
//
// O legado fazia os tres passos soltos e, em caso de erro no meio, o dinheiro
// simplesmente sumia de uma conta sem aparecer na outra.
func (r *Repository) Create(ctx context.Context, userID string, req types.CreateRequest) (gen.AccountTransfer, error) {
	var out gen.AccountTransfer

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	qtx := r.q.WithTx(tx)

	// FOR UPDATE nas duas contas: sem isso, duas transferencias simultaneas da
	// mesma conta poderiam passar as duas pela checagem de saldo.
	from, err := qtx.GetAccountForUpdate(ctx, gen.GetAccountForUpdateParams{ID: req.FromAccountID, UserID: userID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return out, httperrors.BadRequest("Conta inválida")
		}
		return out, err
	}
	if _, err := qtx.GetAccountForUpdate(ctx, gen.GetAccountForUpdateParams{ID: req.ToAccountID, UserID: userID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return out, httperrors.BadRequest("Conta inválida")
		}
		return out, err
	}

	// A data ja passou pela validacao; o parse aqui so converte o formato.
	date, err := dates.ParseDate(req.Date)
	if err != nil {
		return out, httperrors.BadRequest("Data precisa estar no formato AAAA-MM-DD")
	}

	fee := req.FeeOrZero()
	total := req.Amount + fee
	if from.Balance < total {
		return out, httperrors.BadRequest("Saldo insuficiente")
	}

	transfer, err := qtx.CreateTransfer(ctx, gen.CreateTransferParams{
		ID:            uuid.NewString(),
		UserID:        userID,
		FromAccountID: req.FromAccountID,
		ToAccountID:   req.ToAccountID,
		Amount:        req.Amount,
		Date:          date,
		Description:   req.Description,
		Fee:           fee,
	})
	if err != nil {
		return out, err
	}

	// A taxa sai da origem e nao entra em lugar nenhum: e custo.
	if err := ledger.Apply(ctx, qtx, &req.FromAccountID, userID, -total); err != nil {
		return out, err
	}
	if err := ledger.Apply(ctx, qtx, &req.ToAccountID, userID, req.Amount); err != nil {
		return out, err
	}
	if err := tx.Commit(ctx); err != nil {
		return out, err
	}
	return transfer, nil
}

// SoftDelete desfaz a transferencia: devolve valor e taxa para a origem e tira
// o valor do destino.
func (r *Repository) SoftDelete(ctx context.Context, id, userID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	qtx := r.q.WithTx(tx)

	t, err := qtx.GetTransfer(ctx, gen.GetTransferParams{ID: id, UserID: userID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperrors.ErrNotFound
		}
		return err
	}

	rows, err := qtx.SoftDeleteTransfer(ctx, gen.SoftDeleteTransferParams{ID: id, UserID: userID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperrors.ErrNotFound
	}
	if err := ledger.Apply(ctx, qtx, &t.FromAccountID, userID, t.Amount+t.Fee); err != nil {
		return err
	}
	if err := ledger.Apply(ctx, qtx, &t.ToAccountID, userID, -t.Amount); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
