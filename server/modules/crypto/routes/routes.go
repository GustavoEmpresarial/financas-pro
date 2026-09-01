// Package routes registra as rotas de /crypto.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/core/database/gen"
	"financaspro/server/shared/crud"
)

// Mount pendura GET / POST / PUT :id / DELETE :id em /crypto.
func Mount(r chi.Router, c *crud.Controller[gen.CryptoHolding, crud.Body, crud.Body]) {
	crud.Mount(r, "/crypto", c)
}
