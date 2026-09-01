-- Queries de payment_methods. ORDER BY replica o orderBy do modulo legado
-- correspondente: mudar a ordem muda a tela sem ninguem pedir.

-- name: ListPaymentMethods :many
SELECT * FROM payment_methods
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY sort_order ASC, name ASC;

-- name: GetPaymentMethod :one
SELECT * FROM payment_methods
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeletePaymentMethod :execrows
UPDATE payment_methods
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
