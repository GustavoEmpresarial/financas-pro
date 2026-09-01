// Package controller expoe /api/bills.
package controller

import (
	"log/slog"
	"net/http"

	"financaspro/server/core/http/middleware"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/bills/service"
	"financaspro/server/modules/bills/types"
	"financaspro/server/modules/bills/validation"
	"financaspro/server/shared/crud"
	sharedhttp "financaspro/server/shared/http"
	"financaspro/server/shared/query"
)

type Controller struct {
	svc *service.Service
	log *slog.Logger
}

func New(svc *service.Service, log *slog.Logger) *Controller {
	return &Controller{svc: svc, log: log}
}

func (c *Controller) id(r *http.Request) (string, error) {
	return sharedhttp.PathID(r, "id")
}

func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	month, err := query.Month(r, "month")
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	items, err := c.svc.List(r.Context(), middleware.UserID(r.Context()), month)
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
	item, err := c.svc.Create(r.Context(), middleware.UserID(r.Context()), body)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, item)
}

func (c *Controller) Update(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	var body crud.Body
	if err := sharedhttp.Decode(r, &body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.Update(&body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.Update(r.Context(), middleware.UserID(r.Context()), id, body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

func (c *Controller) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.Delete(r.Context(), middleware.UserID(r.Context()), id); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

func (c *Controller) TogglePaid(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.TogglePaid(r.Context(), middleware.UserID(r.Context()), id); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

func (c *Controller) Postpone(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	var req types.PostponeRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.Postpone(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.Postpone(r.Context(), middleware.UserID(r.Context()), id, req.MonthsOrOne()); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

func (c *Controller) Split(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	var req types.SplitRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.Split(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.Split(r.Context(), middleware.UserID(r.Context()), id, req.Parcels); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}
