// Package routes registra /api/upload.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/upload/controller"
)

func Mount(r chi.Router, c *controller.Controller) {
	r.Post("/upload", c.Upload)
}
