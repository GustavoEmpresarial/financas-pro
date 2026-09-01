// Package routes registra as rotas do modulo diagnostics.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/diagnostics/controller"
)

// MountPublic registra o endpoint de escrita, fora do grupo autenticado.
func MountPublic(r chi.Router, c *controller.Controller) {
	r.Post("/diagnostics/errors", c.ReportClient)
}

// MountPrivate registra o endpoint de leitura, dentro do grupo autenticado.
func MountPrivate(r chi.Router, c *controller.Controller) {
	r.Get("/diagnostics/errors", c.List)
}
