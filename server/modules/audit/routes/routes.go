// Package routes registra /api/audit.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/audit/controller"
)

func Mount(r chi.Router, c *controller.Controller) {
	r.Get("/audit/{table}/{recordId}", c.List)
}
