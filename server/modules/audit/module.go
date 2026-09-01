// Package audit monta o modulo de auditoria (/api/audit).
package audit

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/audit/controller"
	"financaspro/server/modules/audit/repository"
	"financaspro/server/modules/audit/routes"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	routes.Mount(r, controller.New(repository.New(pool), log))
}
