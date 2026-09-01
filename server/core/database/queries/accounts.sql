-- Queries de financial_accounts. ORDER BY replica o orderBy do modulo legado
-- correspondente: mudar a ordem muda a tela sem ninguem pedir.

-- name: ListAccounts :many
SELECT * FROM financial_accounts
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY name ASC;

-- name: GetAccount :one
SELECT * FROM financial_accounts
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteAccount :execrows
UPDATE financial_accounts
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteAccountAndDeactivate :execrows
-- Alem do deleted_at, o legado zerava is_active. A tela de contas filtra por
-- is_active em alguns lugares, entao os dois precisam andar juntos.
UPDATE financial_accounts
SET deleted_at = CURRENT_TIMESTAMP, is_active = false, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
