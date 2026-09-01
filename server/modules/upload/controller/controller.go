// Package controller expoe POST /api/upload.
package controller

import (
	"log/slog"
	"net/http"

	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/upload/service"
)

type Controller struct {
	svc *service.Service
	log *slog.Logger
}

func New(svc *service.Service, log *slog.Logger) *Controller {
	return &Controller{svc: svc, log: log}
}

// Upload responde {"url": "/uploads/<bucket>/<uuid>.<ext>"} — sem envelope,
// como o legado. O cliente le data.url direto (api.ts, funcao upload).
func (c *Controller) Upload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(service.MaxFileSize); err != nil {
		responses.Error(w, r, c.log, httperrors.BadRequest("Envio inválido"))
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		responses.Error(w, r, c.log, httperrors.BadRequest("Nenhum arquivo enviado"))
		return
	}
	defer file.Close()

	url, err := c.svc.Save(file, header, r.FormValue("bucket"))
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.JSON(w, http.StatusOK, map[string]any{"url": url})
}
