-- Queries de credit_cards. ORDER BY replica o orderBy do modulo legado
-- correspondente: mudar a ordem muda a tela sem ninguem pedir.

-- name: ListCreditCards :many
SELECT * FROM credit_cards
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY name ASC;

-- name: GetCreditCard :one
SELECT * FROM credit_cards
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteCreditCard :execrows
UPDATE credit_cards
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
