// Package controller expoe o modulo auth em HTTP.
package controller

import (
	"log/slog"
	"net/http"

	"financaspro/server/core/http/middleware"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/auth/service"
	"financaspro/server/modules/auth/types"
	"financaspro/server/modules/auth/validation"
	sharedhttp "financaspro/server/shared/http"
)

type Controller struct {
	svc *service.Service
	log *slog.Logger
}

func New(svc *service.Service, log *slog.Logger) *Controller {
	return &Controller{svc: svc, log: log}
}

func (c *Controller) Register(w http.ResponseWriter, r *http.Request) {
	var req types.RegisterRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.Register(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	out, err := c.svc.Register(r.Context(), req)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	// 200, nao 201: e o status que o legado devolvia.
	responses.JSON(w, http.StatusOK, out)
}

func (c *Controller) Login(w http.ResponseWriter, r *http.Request) {
	var req types.LoginRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.Login(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	out, err := c.svc.Login(r.Context(), req)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.JSON(w, http.StatusOK, out)
}

func (c *Controller) Me(w http.ResponseWriter, r *http.Request) {
	out, err := c.svc.Me(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.JSON(w, http.StatusOK, out)
}
