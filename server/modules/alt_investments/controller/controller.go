// Package controller expoe o sub-recurso de rendimentos.
//
// O CRUD do investimento em si vem do controller generico de shared/crud; aqui
// so mora o que ele nao cobre.
package controller

import (
	"log/slog"
	"net/http"

	"financaspro/server/core/http/middleware"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/alt_investments/repository"
	"financaspro/server/modules/alt_investments/validation"
	"financaspro/server/shared/crud"
	sharedhttp "financaspro/server/shared/http"
)

type EarningsController struct {
	repo *repository.Earnings
	log  *slog.Logger
}

func NewEarnings(repo *repository.Earnings, log *slog.Logger) *EarningsController {
	return &EarningsController{repo: repo, log: log}
}

func (c *EarningsController) List(w http.ResponseWriter, r *http.Request) {
	id, err := sharedhttp.PathID(r, "id")
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	items, err := c.repo.List(r.Context(), id, middleware.UserID(r.Context()))
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, items)
}

func (c *EarningsController) Create(w http.ResponseWriter, r *http.Request) {
	id, err := sharedhttp.PathID(r, "id")
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	var body crud.Body
	if err := sharedhttp.Decode(r, &body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.CreateEarning(&body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	item, err := c.repo.Create(r.Context(), id, middleware.UserID(r.Context()), body)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, item)
}
