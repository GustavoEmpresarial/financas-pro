-- name: ListEarnings :many
-- Filtro de mes por intervalo semiaberto sobre a coluna `date`: pega o mes
-- inteiro sem depender de saber quantos dias ele tem, e continua usando o
-- indice (user_id, deleted_at, date).
SELECT * FROM earnings
WHERE user_id = $1
  AND deleted_at IS NULL
  AND (
    sqlc.narg('month')::text IS NULL
    OR (date >= (sqlc.narg('month')::text || '-01')::date
        AND date < ((sqlc.narg('month')::text || '-01')::date + interval '1 month'))
  )
ORDER BY date DESC;

-- name: GetEarning :one
SELECT * FROM earnings WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteEarning :execrows
UPDATE earnings
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
