// Package investments monta o modulo /investments.
package investments

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/investments/repository"
	"financaspro/server/modules/investments/routes"
	"financaspro/server/modules/investments/validation"
	"financaspro/server/shared/crud"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	repo := repository.New(pool)
	ctrl := crud.New(repo, log, validation.Create, validation.Update)
	routes.Mount(r, ctrl)
}
