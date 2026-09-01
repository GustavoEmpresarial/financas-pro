// Package earnings monta o modulo /api/earnings.
package earnings

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/earnings/controller"
	"financaspro/server/modules/earnings/repository"
	"financaspro/server/modules/earnings/routes"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	routes.Mount(r, controller.New(repository.New(pool), log))
}
