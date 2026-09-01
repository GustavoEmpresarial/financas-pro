-- Queries de crypto_holdings. ORDER BY replica o orderBy do modulo legado
-- correspondente: mudar a ordem muda a tela sem ninguem pedir.

-- name: ListCryptoHoldings :many
SELECT * FROM crypto_holdings
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY name ASC;

-- name: GetCryptoHolding :one
SELECT * FROM crypto_holdings
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteCryptoHolding :execrows
UPDATE crypto_holdings
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
