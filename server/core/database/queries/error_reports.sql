-- name: CreateErrorReport :exec
INSERT INTO error_reports (id, source, level, message, stack, method, path, context, user_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

-- name: ListErrorReports :many
-- Mais recente primeiro, com limite fixo -- esta e a UNICA listagem do
-- sistema com paginacao de verdade (ver docs/decisions/0003-sem-paginacao.md):
-- erro se acumula sem limite natural, ao contrario de transacao ou conta.
SELECT * FROM error_reports
WHERE (sqlc.narg('source')::text IS NULL OR source = sqlc.narg('source')::text)
ORDER BY created_at DESC
LIMIT sqlc.arg('limit_count');

-- name: CountErrorReports :one
SELECT count(*) FROM error_reports;

-- name: DeleteErrorReportsOlderThan :execrows
DELETE FROM error_reports WHERE created_at < sqlc.arg('before');
