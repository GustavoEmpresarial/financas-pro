// Package routes registra /api/category-budgets.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/category_budgets/controller"
)

// Mount registra so GET, POST e DELETE: o legado nunca teve PUT aqui — o fluxo
// da tela e apagar o orcamento e criar outro.
func Mount(r chi.Router, c *controller.Controller) {
	r.Route("/category-budgets", func(sub chi.Router) {
		sub.Get("/", c.List)
		sub.Post("/", c.Create)
		sub.Delete("/{id}", c.Delete)
	})
}
