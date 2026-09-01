// Package service concentra a regra do modulo diagnostics.
package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
	coreDiagnostics "financaspro/server/core/diagnostics"
	"financaspro/server/modules/diagnostics/repository"
	"financaspro/server/modules/diagnostics/types"
	"financaspro/server/modules/diagnostics/validation"
)

// maxListLimit protege o unico endpoint de leitura: sem teto, um cliente
// pedindo limit=999999999 forcaria o Postgres a montar uma resposta do
// tamanho da tabela inteira.
const maxListLimit = 200
const defaultListLimit = 50

type Service struct {
	repo *repository.Repository
	log  *slog.Logger
}

func New(pool *pgxpool.Pool, log *slog.Logger) *Service {
	return &Service{repo: repository.New(pool), log: log}
}

// Register pluga este service como o Reporter que core/diagnostics chama em
// todo 5xx e panic do backend. Chamado uma vez, no boot.
func (s *Service) Register() { coreDiagnostics.Set(s) }

// Report implementa core/diagnostics.Reporter. Roda em background: quem
// chamou (responses.Error, middleware.Recover) esta no meio de responder um
// erro para o cliente, e nao pode esperar uma escrita de banco para
// terminar -- nem falhar a resposta se essa escrita der errado.
//
// Usa context.Background() com timeout proprio, nao o ctx do request: no
// memento em que o panic/erro e capturado, o request pode estar a
// milissegundos de ter sua conexao encerrada, e o ctx do request morreria
// junto, cortando a gravacao pela metade.
func (s *Service) Report(_ context.Context, r coreDiagnostics.Report) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		params := gen.CreateErrorReportParams{
			ID:      uuid.NewString(),
			Source:  r.Source,
			Level:   nonEmpty(r.Level, "error"),
			Message: r.Message,
			UserID:  r.UserID,
		}
		if r.Stack != "" {
			params.Stack = &r.Stack
		}
		if r.Method != "" {
			params.Method = &r.Method
		}
		if r.Path != "" {
			params.Path = &r.Path
		}
		if r.Context != nil {
			if b, err := json.Marshal(r.Context); err == nil {
				params.Context = b
			}
		}

		if err := s.repo.Create(ctx, params); err != nil {
			// Erro ao salvar erro: so pode ir para o log mesmo, nao tem para
			// onde escalar sem risco de loop.
			s.log.Error("falha ao gravar diagnostics", "err", err)
		}
	}()
}

// ReportClient grava um erro reportado pelo frontend.
func (s *Service) ReportClient(ctx context.Context, userID string, req types.ClientReportRequest) error {
	if err := validation.ClientReport(&req); err != nil {
		return err
	}

	var uid *string
	if userID != "" {
		uid = &userID
	}

	contextJSON, _ := json.Marshal(req.Context)
	contextJSON = validation.TruncateContext(contextJSON)

	params := gen.CreateErrorReportParams{
		ID:      uuid.NewString(),
		Source:  "client",
		Level:   req.Level,
		Message: req.Message,
		UserID:  uid,
		Context: contextJSON,
	}
	if req.Stack != "" {
		params.Stack = &req.Stack
	}
	if req.Path != "" {
		params.Path = &req.Path
	}
	return s.repo.Create(ctx, params)
}

func (s *Service) List(ctx context.Context, source *string, limit int32) ([]gen.ErrorReport, error) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	return s.repo.List(ctx, source, limit)
}

func nonEmpty(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
