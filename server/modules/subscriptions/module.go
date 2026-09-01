// Package subscriptions monta o modulo /api/subscriptions.
package subscriptions

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/subscriptions/controller"
	"financaspro/server/modules/subscriptions/routes"
	"financaspro/server/modules/subscriptions/service"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	routes.Mount(r, controller.New(service.New(pool), log))
}
