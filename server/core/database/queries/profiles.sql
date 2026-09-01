-- name: GetProfileByUserID :one
SELECT * FROM profiles WHERE user_id = $1;

-- name: CreateProfile :one
INSERT INTO profiles (id, user_id, display_name, theme_preference)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateProfile :one
-- COALESCE deixa o update ser parcial: parametro nulo mantem a coluna como
-- esta. E o equivalente do `data: { ...campos enviados }` do Prisma.
UPDATE profiles SET
    display_name     = COALESCE(sqlc.narg('display_name'), display_name),
    avatar_url       = COALESCE(sqlc.narg('avatar_url'), avatar_url),
    theme_preference = COALESCE(sqlc.narg('theme_preference'), theme_preference),
    updated_at       = CURRENT_TIMESTAMP
WHERE user_id = sqlc.arg('user_id')
RETURNING *;
