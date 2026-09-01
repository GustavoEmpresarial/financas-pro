-- name: AdjustAccountBalance :execrows
-- Delta pode ser negativo. Somar no banco, em vez de ler-somar-gravar em Go,
-- evita perder um ajuste concorrente.
UPDATE financial_accounts
SET balance = balance + sqlc.arg('delta')::double precision,
    updated_at = CURRENT_TIMESTAMP
WHERE id = sqlc.arg('id') AND user_id = sqlc.arg('user_id') AND deleted_at IS NULL;

-- name: GetAccountForUpdate :one
-- FOR UPDATE segura a linha ate o fim da transacao. Usado nas transferencias,
-- onde e preciso conferir o saldo antes de debitar.
SELECT * FROM financial_accounts
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
FOR UPDATE;
