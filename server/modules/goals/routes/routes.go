// Package routes registra as rotas de /goals.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/core/database/gen"
	"financaspro/server/shared/crud"
)

// Mount pendura GET / POST / PUT :id / DELETE :id em /goals.
func Mount(r chi.Router, c *crud.Controller[gen.FinancialGoal, crud.Body, crud.Body]) {
	crud.Mount(r, "/goals", c)
}
