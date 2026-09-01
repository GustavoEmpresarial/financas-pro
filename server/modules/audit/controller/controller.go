// Package controller expoe o historico de um registro.
package controller

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"financaspro/server/core/http/middleware"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/audit/repository"
)

type Controller struct {
	repo *repository.Repository
	log  *slog.Logger
}

func New(repo *repository.Repository, log *slog.Logger) *Controller {
	return &Controller{repo: repo, log: log}
}

// List responde GET /api/audit/{table}/{recordId}.
//
// Hoje devolve sempre lista vazia: nada no sistema escreve em record_audits.
// O endpoint existe porque o cliente ja o chama (RecordHistoryDialog.tsx).
func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	items, err := c.repo.List(
		r.Context(),
		chi.URLParam(r, "table"),
		chi.URLParam(r, "recordId"),
		middleware.UserID(r.Context()),
	)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, items)
}
