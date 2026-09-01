// Package routes registra /api/earnings.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/earnings/controller"
)

func Mount(r chi.Router, c *controller.Controller) {
	r.Route("/earnings", func(sub chi.Router) {
		sub.Get("/", c.List)
		sub.Post("/", c.Create)
		sub.Put("/{id}", c.Update)
		sub.Delete("/{id}", c.Delete)
	})
}
