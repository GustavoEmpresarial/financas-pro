-- Queries de financial_goals. ORDER BY replica o orderBy do modulo legado
-- correspondente: mudar a ordem muda a tela sem ninguem pedir.

-- name: ListGoals :many
SELECT * FROM financial_goals
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC;

-- name: GetGoal :one
SELECT * FROM financial_goals
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteGoal :execrows
UPDATE financial_goals
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
