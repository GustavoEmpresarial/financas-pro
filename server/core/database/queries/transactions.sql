-- name: ListTransactions :many
-- Reproduz o include do Prisma: category e credit_card viram objeto aninhado.
-- O CASE e necessario porque json_build_object com LEFT JOIN vazio devolveria
-- {"name":null,...} em vez de null, e a tela testa `tx.category &&`.
SELECT
    t.*,
    CASE WHEN c.id IS NULL THEN NULL
         ELSE json_build_object('name', c.name, 'icon', c.icon, 'color', c.color)::jsonb
    END AS category,
    CASE WHEN cc.id IS NULL THEN NULL
         ELSE json_build_object('name', cc.name, 'color', cc.color)::jsonb
    END AS credit_card
FROM transactions t
LEFT JOIN categories   c  ON c.id  = t.category_id
LEFT JOIN credit_cards cc ON cc.id = t.credit_card_id
WHERE t.user_id = $1
  AND t.deleted_at IS NULL
  AND (sqlc.narg('type')::text IS NULL OR t.type = sqlc.narg('type')::text)
  AND (
    sqlc.narg('month')::text IS NULL
    OR (t.date >= (sqlc.narg('month')::text || '-01')::date
        AND t.date < ((sqlc.narg('month')::text || '-01')::date + interval '1 month'))
  )
ORDER BY t.date DESC;

-- name: GetTransaction :one
SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: ListTransactionsByIDs :many
-- Usado antes do delete em lote, para reverter o saldo de cada conta afetada.
SELECT * FROM transactions
WHERE id = ANY(sqlc.arg('ids')::text[]) AND user_id = sqlc.arg('user_id') AND deleted_at IS NULL;

-- name: SoftDeleteTransaction :execrows
UPDATE transactions
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteTransactionsBulk :execrows
UPDATE transactions
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = ANY(sqlc.arg('ids')::text[]) AND user_id = sqlc.arg('user_id') AND deleted_at IS NULL;

-- name: UpdateTransactionStatus :execrows
-- paid_at acompanha o status: virou "paid", carimba agora; saiu de "paid",
-- limpa. Sem isso o relatorio de pagos fica inconsistente.
UPDATE transactions
SET status     = sqlc.arg('status'),
    paid_at    = CASE WHEN sqlc.arg('status')::text = 'paid' THEN sqlc.arg('paid_at')::timestamp ELSE NULL END,
    updated_at = CURRENT_TIMESTAMP
WHERE id = sqlc.arg('id') AND user_id = sqlc.arg('user_id') AND deleted_at IS NULL;

-- name: SetTransactionSubscription :execrows
UPDATE transactions
SET subscription_id     = sqlc.arg('subscription_id'),
    is_recurring        = true,
    recurrence_interval = sqlc.arg('recurrence_interval'),
    updated_at          = CURRENT_TIMESTAMP
WHERE id = sqlc.arg('id') AND user_id = sqlc.arg('user_id') AND deleted_at IS NULL;

-- name: CreateTransaction :one
-- Insert explicito (em vez do sqlbuilder) porque quase todo campo aqui e
-- derivado pelo service: title cai para description, paid_at depende do status,
-- recurrence_interval so existe se is_recurring. Deixar isso como allowlist
-- generica esconderia as regras.
INSERT INTO transactions (
    id, user_id, type, title, amount, category_id, subcategory_id, description,
    notes, date, is_fixed, payment_method, payment_method_id, credit_card_id,
    account_id, status, is_recurring, recurrence_interval, paid_at, tags,
    installment_count, installment_number, installment_group, subscription_id
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
)
RETURNING *;
