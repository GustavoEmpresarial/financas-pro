// Package controller expoe /api/transfers.
package controller

import (
	"log/slog"
	"net/http"

	"financaspro/server/core/http/middleware"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/transfers/repository"
	"financaspro/server/modules/transfers/types"
	"financaspro/server/modules/transfers/validation"
	sharedhttp "financaspro/server/shared/http"
)

type Controller struct {
	repo *repository.Repository
	log  *slog.Logger
}

func New(repo *repository.Repository, log *slog.Logger) *Controller {
	return &Controller{repo: repo, log: log}
}

func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	items, err := c.repo.List(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, items)
}

// Create responde 400 com {"error": ...} quando a regra falha.
//
// O legado devolvia {"ok": false, "error": ...} com status 200 — e como o
// cliente so olha o status HTTP, "Saldo insuficiente" passava despercebido e a
// tela parecia ter salvado. Aqui o erro chega ao usuario.
func (c *Controller) Create(w http.ResponseWriter, r *http.Request) {
	var req types.CreateRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.Create(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	item, err := c.repo.Create(r.Context(), middleware.UserID(r.Context()), req)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, item)
}

func (c *Controller) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := sharedhttp.PathID(r, "id")
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.repo.SoftDelete(r.Context(), id, middleware.UserID(r.Context())); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}
