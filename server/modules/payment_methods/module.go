// Package paymentmethods monta o modulo /payment-methods.
package paymentmethods

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/payment_methods/repository"
	"financaspro/server/modules/payment_methods/routes"
	"financaspro/server/modules/payment_methods/validation"
	"financaspro/server/shared/crud"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	repo := repository.New(pool)
	ctrl := crud.New(repo, log, validation.Create, validation.Update)
	routes.Mount(r, ctrl)
}
