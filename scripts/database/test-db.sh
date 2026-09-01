#!/usr/bin/env bash
# Sobe um Postgres descartavel, aplica as migracoes e roda os testes de
# integracao. Derruba o container no fim, com ou sem falha.
set -euo pipefail

NAME=financaspro-test-db
PORT=${TEST_DB_PORT:-55433}
DSN="postgres://t:t@localhost:${PORT}/t?sslmode=disable"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run -d --name "$NAME" \
  -e POSTGRES_PASSWORD=t -e POSTGRES_USER=t -e POSTGRES_DB=t \
  -p "${PORT}:5432" postgres:16-alpine >/dev/null

# pg_isready fica pronto cedo demais: o entrypoint do postgres reinicia o
# servidor depois da inicializacao. Espera um SELECT de verdade responder.
echo "aguardando o Postgres..."
for _ in $(seq 1 60); do
  if docker exec "$NAME" psql -U t -d t -c "select 1" >/dev/null 2>&1; then break; fi
  sleep 1
done

goose -dir migrations postgres "$DSN" up
TEST_DATABASE_URL="$DSN" go test ./tests/integration/... -tags=integration -count=1 "$@"
