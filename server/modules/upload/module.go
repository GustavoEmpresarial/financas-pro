// Package upload monta o modulo /api/upload.
package upload

import (
	"log/slog"

	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/upload/controller"
	"financaspro/server/modules/upload/routes"
	"financaspro/server/modules/upload/service"
)

func Mount(r chi.Router, uploadDir string, log *slog.Logger) {
	routes.Mount(r, controller.New(service.New(uploadDir), log))
}
