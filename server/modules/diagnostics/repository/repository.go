// Package repository acessa error_reports.
package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
)

type Repository struct{ q *gen.Queries }

func New(pool *pgxpool.Pool) *Repository { return &Repository{q: gen.New(pool)} }

func (r *Repository) Create(ctx context.Context, arg gen.CreateErrorReportParams) error {
	return r.q.CreateErrorReport(ctx, arg)
}

func (r *Repository) List(ctx context.Context, source *string, limit int32) ([]gen.ErrorReport, error) {
	return r.q.ListErrorReports(ctx, gen.ListErrorReportsParams{Source: source, LimitCount: limit})
}

func (r *Repository) Count(ctx context.Context) (int64, error) {
	return r.q.CountErrorReports(ctx)
}

// DeleteOlderThan apaga fisicamente (nao e soft delete: erro velho nao tem
// valor de auditoria, so ocupa espaco). Nao esta ligado a nenhuma rota hoje
// -- fica pronto para o dia em que server/cron/jobs deixar de estar vazio.
func (r *Repository) DeleteOlderThan(ctx context.Context, before time.Time) (int64, error) {
	return r.q.DeleteErrorReportsOlderThan(ctx, before)
}
