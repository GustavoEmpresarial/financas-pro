-- Queries de alt_investments. ORDER BY replica o orderBy do modulo legado
-- correspondente: mudar a ordem muda a tela sem ninguem pedir.

-- name: ListAltInvestments :many
SELECT * FROM alt_investments
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC;

-- name: GetAltInvestment :one
SELECT * FROM alt_investments
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteAltInvestment :execrows
UPDATE alt_investments
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
