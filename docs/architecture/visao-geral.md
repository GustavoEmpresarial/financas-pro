# Arquitetura

## O caminho de um request

```
browser
  │  fetch("/api/transactions", { Authorization: Bearer … })
  ▼
chi router                      server/bootstrap/routes.go
  ├─ Recover        panic vira 500 com o mesmo envelope dos outros erros
  ├─ RequestLogger  uma linha por request concluído
  ├─ CORS
  ├─ Normalize      chaves snake_case do corpo viram camelCase
  └─ Auth           valida o Bearer e injeta userID no context
       ▼
controller           decodifica, valida, chama, escreve a resposta
       ▼
service              regra de negócio; abre transação de banco quando precisa
       ▼
repository           lê o dono do context e chama o sqlc
       ▼
Postgres
```

## As camadas

| Camada | Responsabilidade | Não faz |
|---|---|---|
| `controller` | HTTP: decodificar, validar, escolher o status | regra de negócio, SQL |
| `service` | regra, transação de banco, orquestração | conhecer `http.Request` |
| `repository` | acesso a dados | decidir regra |

Um módulo que não tem regra nenhuma não ganha service: usa o controller
genérico de `shared/crud` direto sobre o repositório. As pastas `controller/` e
`service/` desses módulos existem com um `README.md` explicando por que estão
vazias e o que as preencheria.

## Decisões que moldam o resto

**O contrato HTTP é herdado, não projetado.** O frontend é o mesmo do backend
anterior, então o formato das respostas continua irregular de propósito:
listagem devolve `{"data": [...]}`, mutação devolve `{"ok": true}`, erro devolve
`{"error": "mensagem"}`, e `/api/auth/*` não usa envelope nenhum.
`server/core/http/responses` é o único lugar que constrói essas formas.

**O dono sai do context, nunca do corpo.** `middleware.UserID(ctx)` é a única
fonte. Além disso, `id`, `user_id` e `created_at` não estão em nenhuma allowlist
de escrita, então um corpo malicioso não consegue mudar a posse de um registro.
Coberto por `tests/integration/ownership_test.go`.

**Update parcial é montado, não gerado.** As tabelas são largas e o cliente
manda subconjuntos arbitrários. `shared/sqlbuilder` monta o `UPDATE` a partir de
uma allowlist declarada em código: nome de tabela e de coluna nunca vêm do
request, valor vai sempre como parâmetro. A alternativa em SQL estático seria
`COALESCE` por coluna, que tornaria impossível limpar um campo para `NULL`.

**Saldo é uma função só.** `shared/ledger` decide o efeito de um lançamento no
saldo da conta, e quem chama roda tudo numa transação de banco. No backend
anterior essa regra estava copiada em seis lugares, com escritas soltas em
`financial_accounts` — uma falha no meio deixava o saldo divergente sem erro
visível.

**Datas de negócio andam por `dates.Date`.** No banco são `date`; no JSON
continuam sendo `"AAAA-MM-DD"`, que é o que o frontend envia e exibe. Um
`time.Time` cru sairia como `"2026-09-01T00:00:00Z"` e quebraria as telas.

Para andar mês a mês, use `AddMonths` / `AddMonthsFixingDay`. Somar com
`AddDate` direto é uma armadilha: o Go normaliza o estouro de dia, então
31/01 + 1 mês vira 03/03. Isso já era bug em duas telas do backend anterior.

**O banco valida o que consegue validar.** Datas são `date`, dinheiro é
`numeric(14,2)`, ids são `uuid`, e há `CHECK` de domínio nas colunas de tipo e
status. A validação em Go continua existindo para dar mensagem em português
antes de o request chegar ao banco — o schema é a segunda linha, não a única.
Ver `docs/decisions/0002-tipos-de-coluna.md`.

## O que não existe

Sem Redis, sem fila, sem cron, sem websocket, sem paginação, sem papéis ou
permissões. É um app pessoal de um usuário. As pastas reservadas dizem o que
dispararia cada um.
