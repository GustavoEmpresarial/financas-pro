#!/bin/sh
# Aplica as migracoes pendentes e entrega o PID 1 para a API.
set -e

echo "aplicando migracoes..."
goose -dir /app/migrations postgres "$DATABASE_URL" up

echo "iniciando API..."
# exec: a API vira o PID 1 e recebe o SIGTERM do `docker stop` diretamente.
# Sem isso o shell seguraria o sinal e o shutdown gracioso nunca rodaria.
exec /app/api
