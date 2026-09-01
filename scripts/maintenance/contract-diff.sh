#!/usr/bin/env bash
# Compara as respostas do backend Go com as do backend legado (Fastify).
#
# Serve para conferir, endpoint a endpoint, que a troca de stack nao mudou o
# contrato que o frontend enxerga. Os dois precisam apontar para o MESMO banco.
#
#   Terminal 1: cd legacy/server && PORT=9102 npx tsx src/index.ts
#   Terminal 2: cd current && PORT=9101 make run
#   Terminal 3: ./scripts/maintenance/contract-diff.sh
#
# Saida: uma linha por rota. "=" quando status e corpo batem, "DIFF" quando nao.
set -uo pipefail

NEW=${NEW:-http://localhost:9101}
OLD=${OLD:-http://localhost:9102}
EMAIL=${EMAIL:-contract-diff@teste.com}
PASS=${PASS:-segredo123}

command -v jq >/dev/null || { echo "instale o jq"; exit 1; }

login() {
  local base=$1
  curl -s -X POST "$base/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r '.token // empty'
}

# Registra no legado (mesmo banco, entao o token vale nos dois) e loga.
curl -s -X POST "$OLD/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" >/dev/null
TOKEN=$(login "$OLD")
[ -n "$TOKEN" ] || { echo "nao consegui autenticar no backend legado"; exit 1; }

fail=0

compare() {
  local method=$1 path=$2 body=${3:-}
  local args=(-s -o /dev/stdout -w '\n%{http_code}' -X "$method"
              -H "Authorization: Bearer $TOKEN")
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' -d "$body")

  local a b sa sb
  a=$(curl "${args[@]}" "$OLD$path"); sa=$(tail -n1 <<<"$a"); a=$(sed '$d' <<<"$a")
  b=$(curl "${args[@]}" "$NEW$path"); sb=$(tail -n1 <<<"$b"); b=$(sed '$d' <<<"$b")

  if [ "$sa" != "$sb" ]; then
    printf 'DIFF  %-6s %-30s status %s -> %s\n' "$method" "$path" "$sa" "$sb"
    fail=1
    return
  fi
  if ! diff -q <(jq -S . <<<"$a" 2>/dev/null) <(jq -S . <<<"$b" 2>/dev/null) >/dev/null; then
    printf 'DIFF  %-6s %-30s corpo diferente\n' "$method" "$path"
    diff <(jq -S . <<<"$a") <(jq -S . <<<"$b") | head -20 | sed 's/^/      /'
    fail=1
    return
  fi
  printf '=     %-6s %-30s [%s]\n' "$method" "$path" "$sa"
}

echo "legado: $OLD    go: $NEW"
echo

for path in /api/health /api/auth/me /api/profile /api/categories /api/accounts \
            /api/credit-cards /api/transactions /api/bills /api/investments \
            /api/crypto /api/alt-investments /api/earnings /api/goals \
            /api/payment-methods /api/subscriptions /api/transfers \
            /api/category-budgets; do
  compare GET "$path"
done

# Casos de erro, onde a forma da resposta importa tanto quanto o caminho feliz.
compare POST /api/auth/login '{"email":"nao@existe.com","password":"errada"}'
compare POST /api/categories '{"type":"expense"}'

echo
[ $fail -eq 0 ] && echo "sem diferencas de contrato." || echo "ha diferencas acima."
exit $fail
