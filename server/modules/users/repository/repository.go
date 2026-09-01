// Package repository acessa a tabela profiles.
package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
	apperrors "financaspro/server/shared/errors"
)

type Repository struct{ q *gen.Queries }

func New(pool *pgxpool.Pool) *Repository { return &Repository{q: gen.New(pool)} }

func (r *Repository) Get(ctx context.Context, userID string) (gen.Profile, error) {
	p, err := r.q.GetProfileByUserID(ctx, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return gen.Profile{}, apperrors.ErrNotFound
	}
	return p, err
}

func (r *Repository) Update(ctx context.Context, userID string, arg gen.UpdateProfileParams) error {
	arg.UserID = userID
	_, err := r.q.UpdateProfile(ctx, arg)
	if errors.Is(err, pgx.ErrNoRows) {
		return apperrors.ErrNotFound
	}
	return err
}
