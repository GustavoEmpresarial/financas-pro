#!/bin/sh
# Aplica as migracoes pendentes e entrega o PID 1 para a API.
set -e

# /uploads e um volume nomeado: quando o Docker cria um volume novo ele nasce
# como root, entao o usuario 'app' nao conseguiria gravar os anexos. O
# container sobe como root so para corrigir o dono e ja cai para 'app' via
# su-exec — a API nunca roda como root.
if [ "$(id -u)" = "0" ]; then
  chown -R app /uploads 2>/dev/null || true
  exec su-exec app "$0" "$@"
fi

echo "aplicando migracoes..."
goose -dir /app/migrations postgres "$DATABASE_URL" up

echo "iniciando API..."
# exec: a API vira o PID 1 e recebe o SIGTERM do `docker stop` diretamente.
# Sem isso o shell seguraria o sinal e o shutdown gracioso nunca rodaria.
exec /app/api
