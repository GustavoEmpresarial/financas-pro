// Package routes registra as rotas de /payment-methods.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/core/database/gen"
	"financaspro/server/shared/crud"
)

// Mount pendura GET / POST / PUT :id / DELETE :id em /payment-methods.
func Mount(r chi.Router, c *crud.Controller[gen.PaymentMethod, crud.Body, crud.Body]) {
	crud.Mount(r, "/payment-methods", c)
}
