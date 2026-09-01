// Package routes registra as rotas de /credit-cards.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/core/database/gen"
	"financaspro/server/shared/crud"
)

// Mount pendura GET / POST / PUT :id / DELETE :id em /credit-cards.
func Mount(r chi.Router, c *crud.Controller[gen.CreditCard, crud.Body, crud.Body]) {
	crud.Mount(r, "/credit-cards", c)
}
