// Package transactions monta o modulo /api/transactions.
package transactions

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/transactions/controller"
	"financaspro/server/modules/transactions/routes"
	"financaspro/server/modules/transactions/service"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	routes.Mount(r, controller.New(service.New(pool), log))
}
