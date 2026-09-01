// Package transfers monta o modulo /api/transfers.
package transfers

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/transfers/controller"
	"financaspro/server/modules/transfers/repository"
	"financaspro/server/modules/transfers/routes"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	routes.Mount(r, controller.New(repository.New(pool), log))
}
