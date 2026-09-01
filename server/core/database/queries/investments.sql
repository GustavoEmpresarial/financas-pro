-- Queries de investments. ORDER BY replica o orderBy do modulo legado
-- correspondente: mudar a ordem muda a tela sem ninguem pedir.

-- name: ListInvestments :many
SELECT * FROM investments
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC;

-- name: GetInvestment :one
SELECT * FROM investments
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteInvestment :execrows
UPDATE investments
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
