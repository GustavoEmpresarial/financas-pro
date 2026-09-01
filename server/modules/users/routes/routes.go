// Package routes registra /api/profile.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/users/controller"
)

// Mount usa /profile, e nao /users: e o caminho que o cliente ja chama
// (useTheme.tsx faz PUT /profile a cada troca de tema).
func Mount(r chi.Router, c *controller.Controller) {
	r.Get("/profile", c.Get)
	r.Put("/profile", c.Update)
}
