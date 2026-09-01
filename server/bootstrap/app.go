// Package bootstrap monta a aplicacao: dependencias, rotas e servidor HTTP.
package bootstrap

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/config"
	"financaspro/server/core/database"
	"financaspro/server/core/logger"
	"financaspro/server/shared/security"
)

// App reune tudo que os modulos precisam. E o unico lugar onde dependencia e
// construida — modulo nenhum abre conexao ou le env por conta propria.
type App struct {
	Config *config.Config
	Log    *slog.Logger
	DB     *pgxpool.Pool
	Signer *security.Signer
}

// New le a configuracao, abre o banco e devolve a aplicacao pronta.
// O Close devolvido fecha o que foi aberto.
func New(ctx context.Context) (*App, func(), error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, nil, err
	}

	log := logger.New(cfg.LogLevel)

	if cfg.UsingDevSecret() {
		log.Warn("JWT_SECRET nao definida: usando o segredo de desenvolvimento, que e publico. " +
			"Defina JWT_SECRET antes de expor esta API.")
	}

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, nil, err
	}

	app := &App{
		Config: cfg,
		Log:    log,
		DB:     pool,
		Signer: security.NewSigner(cfg.JWTSecret),
	}
	return app, func() { pool.Close() }, nil
}
