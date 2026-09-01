// Package categorybudgets monta o modulo /api/category-budgets.
package categorybudgets

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/category_budgets/controller"
	"financaspro/server/modules/category_budgets/repository"
	"financaspro/server/modules/category_budgets/routes"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	routes.Mount(r, controller.New(repository.New(pool), log))
}
