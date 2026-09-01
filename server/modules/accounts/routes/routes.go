// Package routes registra as rotas de /accounts.
package routes

import (
	"github.com/go-chi/chi/v5"

	"financaspro/server/core/database/gen"
	"financaspro/server/shared/crud"
)

// Mount pendura GET / POST / PUT :id / DELETE :id em /accounts.
func Mount(r chi.Router, c *crud.Controller[gen.FinancialAccount, crud.Body, crud.Body]) {
	crud.Mount(r, "/accounts", c)
}
