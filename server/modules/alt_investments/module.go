// Package altinvestments monta o modulo /api/alt-investments.
package altinvestments

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/alt_investments/controller"
	"financaspro/server/modules/alt_investments/repository"
	"financaspro/server/modules/alt_investments/routes"
	"financaspro/server/modules/alt_investments/validation"
	"financaspro/server/shared/crud"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	base := crud.New(repository.Base(pool), log, validation.Create, validation.Update)
	earnings := controller.NewEarnings(repository.NewEarnings(pool), log)
	routes.Mount(r, base, earnings)
}
