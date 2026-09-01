// Package crypto monta o modulo /crypto.
package crypto

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/crypto/repository"
	"financaspro/server/modules/crypto/routes"
	"financaspro/server/modules/crypto/validation"
	"financaspro/server/shared/crud"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	repo := repository.New(pool)
	ctrl := crud.New(repo, log, validation.Create, validation.Update)
	routes.Mount(r, ctrl)
}
