// Package repository fala com o banco para o modulo auth.
package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
	apperrors "financaspro/server/shared/errors"
)

type Repository struct {
	pool *pgxpool.Pool
	q    *gen.Queries
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, q: gen.New(pool)}
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (gen.User, error) {
	u, err := r.q.GetUserByEmail(ctx, email)
	if errors.Is(err, pgx.ErrNoRows) {
		return gen.User{}, apperrors.ErrNotFound
	}
	return u, err
}

func (r *Repository) FindByID(ctx context.Context, id string) (gen.User, error) {
	u, err := r.q.GetUserByID(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return gen.User{}, apperrors.ErrNotFound
	}
	return u, err
}

// CreateWithProfile grava usuario e perfil na mesma transacao.
//
// O legado fazia os dois inserts soltos: se o segundo falhasse, sobrava um
// usuario sem perfil e o app quebrava no primeiro GET /api/profile. Aqui ou os
// dois entram, ou nenhum.
func (r *Repository) CreateWithProfile(ctx context.Context, email, passwordHash string, displayName *string) (gen.User, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return gen.User{}, err
	}
	defer tx.Rollback(ctx)

	qtx := r.q.WithTx(tx)

	user, err := qtx.CreateUser(ctx, gen.CreateUserParams{
		ID:           uuid.NewString(),
		Email:        email,
		PasswordHash: passwordHash,
		DisplayName:  displayName,
	})
	if err != nil {
		return gen.User{}, err
	}

	// themePreference "dark" e o default do legado (modules/auth/routes.ts).
	dark := "dark"
	if _, err := qtx.CreateProfile(ctx, gen.CreateProfileParams{
		ID:              uuid.NewString(),
		UserID:          user.ID,
		DisplayName:     displayName,
		ThemePreference: &dark,
	}); err != nil {
		return gen.User{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return gen.User{}, err
	}
	return user, nil
}
