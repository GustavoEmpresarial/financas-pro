// Package routes registra /api/transactions.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/transactions/controller"
)

// Mount registra as rotas em lote ANTES das com {id}.
//
// O chi resolve rota estatica antes de parametro, entao a ordem aqui e so
// legibilidade — mas deixa obvio que /bulk nao e um id.
func Mount(r chi.Router, c *controller.Controller) {
	r.Route("/transactions", func(sub chi.Router) {
		sub.Get("/", c.List)
		sub.Post("/", c.Create)

		sub.Post("/bulk", c.BulkCreate)
		sub.Put("/bulk", c.BulkUpdate)
		sub.Delete("/bulk", c.BulkDelete)

		sub.Put("/{id}", c.Update)
		sub.Delete("/{id}", c.Delete)
		sub.Put("/{id}/status", c.SetStatus)
		sub.Post("/{id}/convert-recurring", c.ConvertRecurring)
	})
}
