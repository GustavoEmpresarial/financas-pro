// Package users monta o modulo de perfil (/api/profile).
package users

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/users/controller"
	"financaspro/server/modules/users/repository"
	"financaspro/server/modules/users/routes"
)

func Mount(r chi.Router, pool *pgxpool.Pool, log *slog.Logger) {
	routes.Mount(r, controller.New(repository.New(pool), log))
}
