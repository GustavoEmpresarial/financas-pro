-- name: ListSubscriptions :many
SELECT * FROM recurring_subscriptions
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY name ASC;

-- name: GetSubscription :one
SELECT * FROM recurring_subscriptions
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteSubscription :execrows
-- Alem do deleted_at, o legado zerava is_active e marcava status "canceled".
UPDATE recurring_subscriptions
SET deleted_at = CURRENT_TIMESTAMP,
    is_active  = false,
    status     = 'canceled',
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: MarkSubscriptionCharged :execrows
UPDATE recurring_subscriptions
SET last_charged_at   = sqlc.arg('last_charged_at'),
    next_billing_date = sqlc.arg('next_billing_date'),
    updated_at        = CURRENT_TIMESTAMP
WHERE id = sqlc.arg('id') AND user_id = sqlc.arg('user_id') AND deleted_at IS NULL;

-- name: CreateSubscriptionCharge :one
INSERT INTO subscription_charges (id, user_id, subscription_id, transaction_id, amount, charge_date, status)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: CreateSubscription :one
INSERT INTO recurring_subscriptions (
    id, user_id, name, amount, frequency, category_id, account_id,
    payment_method_id, next_billing_date, billing_day, status, is_active,
    source_transaction_id, notes, color, icon, logo_url
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
)
RETURNING *;
