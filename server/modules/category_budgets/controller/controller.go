// Package controller expoe /api/category-budgets.
//
// Nao usa shared/crud porque o modulo nao tem PUT e o GET aceita ?month.
package controller

import (
	"log/slog"
	"net/http"

	"financaspro/server/core/http/middleware"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/category_budgets/repository"
	"financaspro/server/modules/category_budgets/validation"
	"financaspro/server/shared/crud"
	sharedhttp "financaspro/server/shared/http"
	"financaspro/server/shared/query"
)

type Controller struct {
	repo *repository.Repository
	log  *slog.Logger
}

func New(repo *repository.Repository, log *slog.Logger) *Controller {
	return &Controller{repo: repo, log: log}
}

func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	month, err := query.Month(r, "month")
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	items, err := c.repo.List(r.Context(), middleware.UserID(r.Context()), month)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, items)
}

func (c *Controller) Create(w http.ResponseWriter, r *http.Request) {
	var body crud.Body
	if err := sharedhttp.Decode(r, &body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.Create(&body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	item, err := c.repo.Create(r.Context(), middleware.UserID(r.Context()), body)
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
