-- name: ListCategoryBudgets :many
-- O json_build_object reproduz o `include: { category: { select: ... } }` do
-- Prisma: a tela le budget.category.name direto.
SELECT
    cb.*,
    json_build_object('name', c.name, 'icon', c.icon, 'color', c.color)::jsonb 
AS category
FROM category_budgets cb
JOIN categories c ON c.id = cb.category_id
WHERE cb.user_id = $1
  AND cb.deleted_at IS NULL
  AND (sqlc.narg('month')::text IS NULL OR cb.month = sqlc.narg('month')::text)
ORDER BY cb.month DESC, c.name ASC;

-- name: GetCategoryBudget :one
SELECT
    cb.*,
    json_build_object('name', c.name, 'icon', c.icon, 'color', c.color)::jsonb 
AS category
FROM category_budgets cb
JOIN categories c ON c.id = cb.category_id
WHERE cb.id = $1 AND cb.user_id = $2 AND cb.deleted_at IS NULL;

-- name: SoftDeleteCategoryBudget :execrows
UPDATE category_budgets
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
