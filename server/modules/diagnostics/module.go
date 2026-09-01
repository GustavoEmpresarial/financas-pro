// Package diagnostics monta o modulo de coleta de erros.
//
// E o unico modulo com uma rota publica e uma privada ao mesmo tempo: gravar
// um erro (POST) nao pode exigir sessao, porque o app tambem quebra antes do
// login; ler o historico (GET) exige, porque e uma ferramenta de quem
// mantem o app, nao um dado do usuario comum.
package diagnostics

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/modules/diagnostics/controller"
	"financaspro/server/modules/diagnostics/routes"
	"financaspro/server/modules/diagnostics/service"
)

// New constroi o service e ja o registra em core/diagnostics como o
// Reporter que captura panic e erro 5xx do resto do backend. Chame isto
// antes de montar as rotas do modulo.
func New(pool *pgxpool.Pool, log *slog.Logger) *service.Service {
	svc := service.New(pool, log)
	svc.Register()
	return svc
}

func MountPublic(r chi.Router, svc *service.Service, log *slog.Logger) {
	routes.MountPublic(r, controller.New(svc, log))
}

func MountPrivate(r chi.Router, svc *service.Service, log *slog.Logger) {
	routes.MountPrivate(r, controller.New(svc, log))
}
