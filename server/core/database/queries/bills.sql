-- name: ListBills :many
SELECT * FROM bills
WHERE user_id = $1
  AND deleted_at IS NULL
  AND (
    sqlc.narg('month')::text IS NULL
    OR (due_date >= (sqlc.narg('month')::text || '-01')::date
        AND due_date < ((sqlc.narg('month')::text || '-01')::date + interval '1 month'))
  )
ORDER BY due_date ASC;

-- name: GetBill :one
SELECT * FROM bills WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteBill :execrows
UPDATE bills
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SetBillPaid :execrows
UPDATE bills
SET is_paid      = sqlc.arg('is_paid'),
    paid_date    = sqlc.narg('paid_date'),
    paid_amount  = sqlc.arg('paid_amount'),
    status       = sqlc.arg('status'),
    updated_at   = CURRENT_TIMESTAMP
WHERE id = sqlc.arg('id') AND user_id = sqlc.arg('user_id') AND deleted_at IS NULL;

-- name: PostponeBill :execrows
UPDATE bills
SET due_date   = sqlc.arg('due_date'),
    status     = 'postponed',
    updated_at = CURRENT_TIMESTAMP
WHERE id = sqlc.arg('id') AND user_id = sqlc.arg('user_id') AND deleted_at IS NULL;

-- name: CreateBillInstallment :exec
-- Usada pelo split: gera cada parcela a partir da conta original.
INSERT INTO bills (
    id, user_id, title, amount, due_date, category_id, account_id,
    priority, status, notes, installment_count, installment_number, installment_group
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12);
