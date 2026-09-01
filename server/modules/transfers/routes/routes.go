// Package routes registra /api/transfers.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/transfers/controller"
)

// Sem PUT: o legado nao tinha. Editar transferencia significaria recalcular o
// saldo das duas contas; o fluxo da tela e apagar e criar de novo.
func Mount(r chi.Router, c *controller.Controller) {
	r.Route("/transfers", func(sub chi.Router) {
		sub.Get("/", c.List)
		sub.Post("/", c.Create)
		sub.Delete("/{id}", c.Delete)
	})
}
