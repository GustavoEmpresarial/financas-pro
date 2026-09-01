package crud

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/http/middleware"
	apperrors "financaspro/server/shared/errors"
	"financaspro/server/shared/sqlbuilder"
	"financaspro/server/shared/utils"
)

// Body e o corpo de um POST/PUT dos modulos CRUD.
//
// E map em vez de struct de proposito: o legado gravava qualquer campo que o
// cliente mandasse, e mais de uma tela manda subconjuntos diferentes da mesma
// entidade. O que impede escrita indevida nao e a tipagem do DTO, e a allowlist
// de colunas em SQL.Columns — id, user_id e created_at nao estao em nenhuma.
type Body map[string]any

// SQL e o que cada modulo precisa declarar: onde escrever, o que pode ser
// escrito, e as tres leituras tipadas que vem do sqlc.
type SQL[T any] struct {
	Table   string
	Columns sqlbuilder.Columns

	List   func(ctx context.Context, userID string) ([]T, error)
	Get    func(ctx context.Context, id, userID string) (T, error)
	Delete func(ctx context.Context, id, userID string) (int64, error)
}

// Repo implementa Repository[T, Body, Body] sobre SQL[T].
type Repo[T any] struct {
	pool *pgxpool.Pool
	sql  SQL[T]
}

func NewRepo[T any](pool *pgxpool.Pool, sql SQL[T]) *Repo[T] {
	return &Repo[T]{pool: pool, sql: sql}
}

func (r *Repo[T]) List(ctx context.Context) ([]T, error) {
	return r.sql.List(ctx, middleware.UserID(ctx))
}

func (r *Repo[T]) Create(ctx context.Context, body Body) (T, error) {
	var zero T
	userID := middleware.UserID(ctx)

	patch := sqlbuilder.NewPatch(body, r.sql.Columns, utils.CamelToSnake).
		Set("id", uuid.NewString()).
		Set("user_id", userID)

	query, args, err := patch.Insert(r.sql.Table)
	if err != nil {
		return zero, err
	}

	var id string
	if err := r.pool.QueryRow(ctx, query, args...).Scan(&id); err != nil {
		return zero, err
	}
	// Segunda ida ao banco para devolver a linha ja tipada pelo sqlc, com os
	// defaults que o banco preencheu. Custa um round-trip e evita ter de
	// reimplementar o scan de cada tabela a mao.
	return r.sql.Get(ctx, id, userID)
}

func (r *Repo[T]) Update(ctx context.Context, id string, body Body) (T, error) {
	var zero T
	userID := middleware.UserID(ctx)

	patch := sqlbuilder.NewPatch(body, r.sql.Columns, utils.CamelToSnake)
	query, args, err := patch.UpdateOwned(r.sql.Table, id, userID)
	if err != nil {
		return zero, err
	}

	tag, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return zero, err
	}
	if tag.RowsAffected() == 0 {
		// Nao existe, ja foi apagado, ou e de outro dono — os tres viram 404.
		// Responder 403 no ultimo caso confirmaria que o id existe.
		return zero, apperrors.ErrNotFound
	}
	return zero, nil
}

func (r *Repo[T]) SoftDelete(ctx context.Context, id string) error {
	rows, err := r.sql.Delete(ctx, id, middleware.UserID(ctx))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperrors.ErrNotFound
		}
		return fmt.Errorf("apagando %s: %w", r.sql.Table, err)
	}
	if rows == 0 {
		return apperrors.ErrNotFound
	}
	return nil
}
