// Package controller expoe /api/transactions.
package controller

import (
	"log/slog"
	"net/http"

	"financaspro/server/core/http/middleware"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/transactions/service"
	"financaspro/server/modules/transactions/types"
	"financaspro/server/modules/transactions/validation"
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
	txType := query.String(r, "type")
	items, err := c.svc.List(r.Context(), middleware.UserID(r.Context()), month, txType)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, items)
}

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
	item, err := c.svc.Create(r.Context(), middleware.UserID(r.Context()), req)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, item)
}

// BulkCreate responde {"count": n} — sem envelope "data", como o legado.
func (c *Controller) BulkCreate(w http.ResponseWriter, r *http.Request) {
	var req types.BulkCreateRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.BulkCreate(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	count, err := c.svc.BulkCreate(r.Context(), middleware.UserID(r.Context()), req.Transactions)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.JSON(w, http.StatusOK, map[string]any{"count": count})
}

func (c *Controller) Update(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	var body map[string]any
	if err := sharedhttp.Decode(r, &body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.Update(r.Context(), middleware.UserID(r.Context()), id, body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

func (c *Controller) BulkUpdate(w http.ResponseWriter, r *http.Request) {
	var req types.BulkUpdateRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.BulkIDs(req.IDs); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.BulkUpdate(r.Context(), middleware.UserID(r.Context()), req.IDs, req.Updates); err != nil {
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

func (c *Controller) BulkDelete(w http.ResponseWriter, r *http.Request) {
	var req types.BulkDeleteRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.BulkIDs(req.IDs); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.BulkDelete(r.Context(), middleware.UserID(r.Context()), req.IDs); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

func (c *Controller) SetStatus(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	var req types.StatusRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.Status(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.SetStatus(r.Context(), middleware.UserID(r.Context()), id, req.Status); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

func (c *Controller) ConvertRecurring(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	var req types.ConvertRecurringRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.ConvertRecurring(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.ConvertRecurring(r.Context(), middleware.UserID(r.Context()), id, req.Frequency); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}
