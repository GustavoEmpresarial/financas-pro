-- name: ListTransfers :many
SELECT
    t.*,
    json_build_object('name', f.name, 'color', f.color)::jsonb  
AS from_account,
    json_build_object('name', d.name, 'color', d.color)::jsonb  
AS to_account
FROM account_transfers t
JOIN financial_accounts f ON f.id = t.from_account_id
JOIN financial_accounts d ON d.id = t.to_account_id
WHERE t.user_id = $1 AND t.deleted_at IS NULL
ORDER BY t.date DESC;

-- name: GetTransfer :one
SELECT * FROM account_transfers
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: CreateTransfer :one
INSERT INTO account_transfers (id, user_id, from_account_id, to_account_id, amount, date, description, fee)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: SoftDeleteTransfer :execrows
UPDATE account_transfers
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
