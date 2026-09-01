// Package routes registra as rotas do modulo auth.
package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"financaspro/server/modules/auth/controller"
)

// Mount pendura o modulo em /api/auth.
//
// register e login sao publicos; me exige o middleware de auth, que chega
// pronto em authMiddleware.
func Mount(r chi.Router, c *controller.Controller, authMiddleware func(http.Handler) http.Handler) {
	r.Route("/auth", func(auth chi.Router) {
		auth.Post("/register", c.Register)
		auth.Post("/login", c.Login)

		auth.Group(func(private chi.Router) {
			private.Use(authMiddleware)
			private.Get("/me", c.Me)
		})
	})
}
