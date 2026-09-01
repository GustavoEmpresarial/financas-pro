// Package routes registra /api/subscriptions.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/subscriptions/controller"
)

func Mount(r chi.Router, c *controller.Controller) {
	r.Route("/subscriptions", func(sub chi.Router) {
		sub.Get("/", c.List)
		sub.Post("/", c.Create)

		// /charge/{id} vem antes de /{id} por clareza: e o formato que o
		// legado expunha (POST /api/subscriptions/charge/:id), e o cliente
		// ja chama assim.
		sub.Post("/charge/{id}", c.Charge)

		sub.Put("/{id}", c.Update)
		sub.Delete("/{id}", c.Delete)
	})
}
