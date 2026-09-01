// Package creditcards monta o modulo /credit-cards.
package creditcards

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/credit_cards/repository"
	"financaspro/server/modules/credit_cards/routes"
	"financaspro/server/modules/credit_cards/validation"
	"financaspro/server/shared/crud"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	repo := repository.New(pool)
	ctrl := crud.New(repo, log, validation.Create, validation.Update)
	routes.Mount(r, ctrl)
}
