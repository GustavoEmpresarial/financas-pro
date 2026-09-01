# Contrato HTTP

Base: `/api`. Tudo exige `Authorization: Bearer <token>`, exceto
`POST /auth/register`, `POST /auth/login` e `GET /health`.

## Formato das respostas

Irregular por herança do backend anterior, e mantido assim porque o frontend
depende dele. Ver `docs/decisions/0001-backend-em-go.md`.

| Situação | Corpo | Status |
|---|---|---|
| Listagem | `{"data": [...]}` | 200 |
| Criação | `{"data": {...}}` | 200 (não 201) |
| Atualização | `{"ok": true}` | 200 |
| Exclusão | `{"ok": true}` | 200 |
| Erro | `{"error": "mensagem em português"}` | 400/401/404/409/500 |
| `auth/register`, `auth/login` | `{"token": "...", "user": {...}}` | 200 |
| `auth/me` | `{"user": {...}}` | 200 |
| `upload` | `{"url": "/uploads/..."}` | 200 |
| `transactions/bulk` (POST) | `{"count": n}` | 200 |

Exclusão é lógica: o registro sai das listagens e permanece na tabela com
`deleted_at` preenchido. Apagar de novo devolve 404.

Registro inexistente, já apagado ou de outro dono devolvem os três **404** —
403 confirmaria que o id existe.

## Tipos no JSON

O schema usa `uuid`, `numeric` e `date`, mas o JSON é o mesmo de sempre:

| Campo | Exemplo |
|---|---|
| id e qualquer `*Id` | `"e2b20194-88e3-4bab-bf5a-71a1028290ed"` |
| valor monetário | `189.9` (número, não string) |
| data de negócio | `"2026-09-01"` |
| `paidAt`, `createdAt`, `updatedAt`, `deletedAt` | `"2026-09-01T18:43:52.187Z"` |

Um id fora do formato uuid devolve **404**, igual a id inexistente.
Um `*Id` enviado como `""` é gravado como nulo.

## Rotas

### auth
| Método | Rota | Notas |
|---|---|---|
| POST | `/auth/register` | cria usuário e perfil na mesma transação; 409 se o e-mail existe |
| POST | `/auth/login` | 401 `Credenciais inválidas` tanto para e-mail quanto para senha errada |
| GET | `/auth/me` | |

Token: HS256, validade 7 dias, claims `userId` e `email`. **Esses nomes são
contrato**: o browser decodifica o payload sem verificar assinatura em
`client/src/features/auth/hooks/useAuth.tsx` e devolve `null` sem `userId` —
renomear desloga o usuário a cada F5, sem erro no console.

### CRUD padrão
`GET` · `POST` · `PUT /{id}` · `DELETE /{id}`, sempre escopados ao dono:

`/categories` `/accounts` `/credit-cards` `/investments` `/crypto`
`/payment-methods` `/goals` `/alt-investments`

Detalhes que fogem do padrão:
- `DELETE /categories/{id}` apaga também as subcategorias.
- `DELETE /accounts/{id}` também marca `is_active = false`.
- `GET /alt-investments/{id}/earnings` e `POST` no mesmo caminho.

### transactions
| Método | Rota | Notas |
|---|---|---|
| GET | `/transactions?month=AAAA-MM&type=income\|expense` | traz `category` e `creditCard` aninhados |
| POST | `/transactions` | ajusta o saldo da conta; `createSubscription: true` junto de `isRecurring` também cria a assinatura |
| POST | `/transactions/bulk` | importação; máximo 500; **não** mexe em saldo |
| PUT | `/transactions/bulk` | `{ids, updates}`; não mexe em saldo |
| DELETE | `/transactions/bulk` | `{ids}`; reverte o saldo de cada uma |
| PUT | `/transactions/{id}` | reverte o efeito antigo e aplica o novo |
| DELETE | `/transactions/{id}` | reverte o saldo |
| PUT | `/transactions/{id}/status` | `paid_at` acompanha o status |
| POST | `/transactions/{id}/convert-recurring` | |

### bills
`GET ?month=` · `POST` · `PUT /{id}` · `DELETE /{id}`, mais:

| Método | Rota | Notas |
|---|---|---|
| PUT | `/bills/{id}/toggle-paid` | alterna pago/pendente e preenche ou limpa `paid_date`/`paid_amount` |
| POST | `/bills/{id}/postpone` | `{months}` (1 a 120); vencimento dia 31 adiado cai no último dia do mês curto |
| POST | `/bills/{id}/split` | `{parcels}` (2 a 120); a última parcela absorve o arredondamento para a soma fechar |

### subscriptions
`GET` · `POST` · `PUT /{id}` · `DELETE /{id}`, mais
`POST /subscriptions/charge/{id}`.

Criar também lança a primeira transação. Cobrar cria transação + registro em
`subscription_charges` e avança `next_billing_date`, ancorado em `billing_day`.

### outros
| Método | Rota | Notas |
|---|---|---|
| GET/POST/PUT/DELETE | `/earnings` | `?month=`; ajusta o saldo da conta |
| GET/POST/DELETE | `/transfers` | sem PUT; move saldo; a taxa sai da origem |
| GET/POST/DELETE | `/category-budgets` | sem PUT; `?month=`; traz `category` aninhada |
| GET/PUT | `/profile` | |
| GET | `/audit/{table}/{recordId}` | últimos 100; sempre vazio hoje — nada escreve auditoria |
| POST | `/upload` | multipart `file` + `bucket`; 10 MB; png/jpg/gif/webp/pdf |
| GET | `/health` | público |

### diagnostics
| Método | Rota | Notas |
|---|---|---|
| POST | `/diagnostics/errors` | público; identifica o dono se um Bearer válido vier junto, mas nunca exige um. Ver `docs/decisions/0004-coleta-de-erros.md` |
| GET | `/diagnostics/errors` | autenticado; `?source=server\|client`, `?limit=` (máx. 200, padrão 50) |

## Diferenças propositais em relação ao backend anterior

Nenhuma muda a forma da resposta no caminho feliz.

1. **Validação existe.** Antes, `lib/validation.ts` tinha schemas zod que
   nenhuma rota importava. Entradas inválidas agora devolvem 400 em vez de
   chegarem cruas ao banco.
2. **Transferência sem saldo devolve 400.** Antes devolvia 200 com
   `{"ok": false, "error": ...}`, e como o cliente só olha o status, o erro
   passava batido e a tela parecia ter salvado.
3. **Auditoria filtra por dono.** Antes, saber tabela e id bastava para ler o
   histórico de qualquer usuário.
4. **Rendimento de investimento alternativo confere o dono** antes de gravar.
5. **Upload restringe extensão e valida o bucket.** Antes aceitava qualquer
   extensão — incluindo `.html`, servido de volta na mesma origem, o que
   permitiria roubar o token do `localStorage` — e um bucket com `../` escrevia
   fora do diretório de uploads.
6. **Operações compostas são atômicas.** Cobrança de assinatura, transferência,
   parcelamento e qualquer ajuste de saldo commitam por inteiro ou não commitam.
