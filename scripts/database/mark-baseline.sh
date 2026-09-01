#!/usr/bin/env bash
# Marca a 00001 como aplicada SEM rodar o DDL.
#
# Use so num banco que ja tem as tabelas (por exemplo, criado pelo Prisma com
# `db push` antes da migracao para Go). Num banco vazio, o certo e `make migrate`.
set -euo pipefail

: "${DATABASE_URL:?defina DATABASE_URL}"

echo "Isso vai registrar a migracao 00001 como aplicada em:"
echo "  ${DATABASE_URL%%\?*}"
echo "Nenhuma tabela sera criada ou alterada."
read -r -p "Confirmar? [s/N] " ok
[[ "$ok" == "s" || "$ok" == "S" ]] || { echo "Cancelado."; exit 1; }

goose -dir migrations postgres "$DATABASE_URL" up-to 0 >/dev/null 2>&1 || true

psql "$DATABASE_URL" <<'SQL'
CREATE TABLE IF NOT EXISTS goose_db_version (
    id         SERIAL PRIMARY KEY,
    version_id BIGINT NOT NULL,
    is_applied BOOLEAN NOT NULL,
    tstamp     TIMESTAMP NULL DEFAULT NOW()
);
INSERT INTO goose_db_version (version_id, is_applied)
SELECT 0, true WHERE NOT EXISTS (SELECT 1 FROM goose_db_version WHERE version_id = 0);
INSERT INTO goose_db_version (version_id, is_applied)
SELECT 1, true WHERE NOT EXISTS (SELECT 1 FROM goose_db_version WHERE version_id = 1);
SQL

echo "Pronto. Confira com: goose -dir migrations postgres \"\$DATABASE_URL\" status"
