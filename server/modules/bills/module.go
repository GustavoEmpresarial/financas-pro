// Package bills monta o modulo /api/bills.
package bills

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/bills/controller"
	"financaspro/server/modules/bills/routes"
	"financaspro/server/modules/bills/service"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	routes.Mount(r, controller.New(service.New(pool), log))
}
