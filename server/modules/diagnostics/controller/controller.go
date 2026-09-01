// Package controller expoe o modulo diagnostics em HTTP.
package controller

import (
	"log/slog"
	"net/http"
	"strconv"

	"financaspro/server/core/http/reqctx"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/diagnostics/service"
	"financaspro/server/modules/diagnostics/types"
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

// ReportClient recebe POST /api/diagnostics/errors.
//
// Rota publica (nao exige token) mas passa por OptionalAuth (ver
// bootstrap/routes.go): um crash antes do login nao tem token nenhum, e e
// aceito do mesmo jeito; um crash de quem ja esta logado vem com o dono
// preenchido, quando o Authorization presente for valido. reqctx.UserID
// devolve "" nos dois outros casos (sem header, ou token invalido/expirado).
func (c *Controller) ReportClient(w http.ResponseWriter, r *http.Request) {
	var req types.ClientReportRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	req.Path = firstNonEmpty(req.Path, r.Header.Get("Referer"))

	if err := c.svc.ReportClient(r.Context(), reqctx.UserID(r.Context()), req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

// List responde GET /api/diagnostics/errors — dentro do grupo autenticado
// (ver module.go): ver o historico de erros e para quem ja esta logado.
func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	source := query.String(r, "source")
	limit := 0
	if v := r.URL.Query().Get("limit"); v != "" {
		limit, _ = strconv.Atoi(v)
	}

	items, err := c.svc.List(r.Context(), source, int32(limit))
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, items)
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
