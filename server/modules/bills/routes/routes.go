// Package routes registra /api/bills.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/bills/controller"
)

func Mount(r chi.Router, c *controller.Controller) {
	r.Route("/bills", func(sub chi.Router) {
		sub.Get("/", c.List)
		sub.Post("/", c.Create)
		sub.Put("/{id}", c.Update)
		sub.Delete("/{id}", c.Delete)

		sub.Put("/{id}/toggle-paid", c.TogglePaid)
		sub.Post("/{id}/postpone", c.Postpone)
		sub.Post("/{id}/split", c.Split)
	})
}
