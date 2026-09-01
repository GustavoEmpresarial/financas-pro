// Package auth e o ponto de entrada do modulo: monta as camadas e registra as
// rotas. Equivale ao index.ts do desenho original.
package auth

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/auth/controller"
	"financaspro/server/modules/auth/repository"
	"financaspro/server/modules/auth/routes"
	"financaspro/server/modules/auth/service"
	"financaspro/server/shared/security"
)

func Mount(r chi.Router, pool *pgxpool.Pool, signer *security.Signer, log *slog.Logger, authMiddleware func(http.Handler) http.Handler) {
	repo := repository.New(pool)
	svc := service.New(repo, signer)
	ctrl := controller.New(svc, log)
	routes.Mount(r, ctrl, authMiddleware)
}
