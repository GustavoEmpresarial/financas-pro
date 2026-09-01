// Package routes registra /api/alt-investments.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/core/database/gen"
	"financaspro/server/modules/alt_investments/controller"
	"financaspro/server/shared/crud"
)

func Mount(
	r chi.Router,
	base *crud.Controller[gen.AltInvestment, crud.Body, crud.Body],
	earnings *controller.EarningsController,
) {
	r.Route("/alt-investments", func(sub chi.Router) {
		sub.Get("/", base.List)
		sub.Post("/", base.Create)
		sub.Put("/{id}", base.Update)
		sub.Delete("/{id}", base.Delete)

		sub.Get("/{id}/earnings", earnings.List)
		sub.Post("/{id}/earnings", earnings.Create)
	})
}
