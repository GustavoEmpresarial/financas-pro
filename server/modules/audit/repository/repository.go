// Package repository acessa record_audits.
package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
)

type Repository struct{ q *gen.Queries }

func New(pool *pgxpool.Pool) *Repository { return &Repository{q: gen.New(pool)} }

func (r *Repository) List(ctx context.Context, table, recordID, userID string) ([]gen.RecordAudit, error) {
	return r.q.ListAudits(ctx, gen.ListAuditsParams{
		TableName: table,
		RecordID:  recordID,
		UserID:    &userID,
	})
}
