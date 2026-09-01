-- name: ListAltInvestmentEarnings :many
-- Tambem sem filtro por dono no legado. Aqui o user_id entra no WHERE.
SELECT * FROM alt_investment_earnings
WHERE investment_id = $1 AND user_id = $2 AND deleted_at IS NULL
ORDER BY date DESC;

-- name: GetAltInvestmentEarning :one
SELECT * FROM alt_investment_earnings
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
