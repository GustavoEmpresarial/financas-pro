-- Queries de categories. ORDER BY replica o orderBy do modulo legado
-- correspondente: mudar a ordem muda a tela sem ninguem pedir.

-- name: ListCategorys :many
SELECT * FROM categories
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY sort_order ASC, name ASC;

-- name: GetCategory :one
SELECT * FROM categories
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteCategory :execrows
UPDATE categories
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteCategoryWithChildren :execrows
-- O legado apagava a categoria e os filhos dela na mesma acao. Aqui isso vira
-- uma condicao so, em vez de duas queries com uma janela entre elas.
UPDATE categories
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE user_id = $2
  AND deleted_at IS NULL
  AND (id = $1 OR parent_id = $1);
