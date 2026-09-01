# 0002 — Tipos de coluna corretos no baseline

**Data:** 2026-09-01 · **Status:** aceito · **Substitui:** uma versão anterior
desta decisão, que mandava replicar os tipos do Prisma como estavam

## Contexto

O `schema.prisma` do backend anterior fazia quatro escolhas discutíveis:

1. **Datas de negócio como `TEXT`** no formato `AAAA-MM-DD` — `transactions.date`,
   `bills.due_date`, `purchase_date`, `next_billing_date`. O banco aceitava
   `"2026-02-30"` e `"amanhã"` sem reclamar.
2. **Dinheiro como `DOUBLE PRECISION`.** Float binário não representa `0,10`
   exatamente. Como o saldo é acumulado no banco (`balance = balance + $1`), o
   erro se somava a cada lançamento: dez lançamentos de dez centavos davam
   `0,9999999999999999`.
3. **Ids como `TEXT`** — 36 bytes por chave, sem validação do banco.
4. **`bills` referenciava `category_id`, `account_id` e `payment_method_id` sem
   FK**, enquanto `transactions`, com os mesmos campos, tinha. Uma conta podia
   apontar para uma categoria inexistente.

O plano de migração previa replicar tudo isso, para que o porte mudasse **uma**
variável só — a linguagem — e qualquer bug fosse atribuível a ela.

Só que a premissa era que existiam dados vivos. Não existiam: na hora da
migração não havia nenhum Postgres criado, nenhum dump, nenhum registro. O
`docker-compose` do legado nunca tinha subido nesta máquina.

## Decisão

Corrigir os quatro no baseline, enquanto isso custa uma migração em vez de uma
conversão com dados.

| Antes | Agora |
|---|---|
| `TEXT` (data de negócio) | `date` |
| `DOUBLE PRECISION` (dinheiro) | `numeric(14,2)` |
| `TEXT` (id) | `uuid` |
| `bills.*_id` sem FK | com FK |

Mais: `CHECK`s de domínio (tipo, status, prioridade, dia do mês, valor
positivo), índice único de e-mail *case-insensitive*, e FK em
`earnings.account_id`, que também não existia.

Cripto não usa `numeric(14,2)`: `0,00000001 BTC` é posição válida, então
`quantity` é `numeric(28,10)` e os preços são `numeric(20,8)`.

`category_budgets.month` continua `text`, com `CHECK` de formato: é a
competência `"AAAA-MM"`, não uma data — guardar o dia 1 obrigaria a converter
nos dois sentidos sem ganho nenhum.

## O contrato HTTP não muda

Essa é a condição que torna a decisão segura. O frontend é o mesmo, então cada
tipo novo no banco tem um tipo Go que serializa exatamente como antes:

| Coluna | Go | JSON |
|---|---|---|
| `uuid` | `string` | `"e2b2…"` |
| `numeric` | `float64` | `189.9` |
| `date` | `dates.Date` | `"2026-09-01"` |
| `timestamp` | `time.Time` | `"2026-09-01T18:43:52.187Z"` |

`dates.Date` (em `server/shared/dates/date.go`) existe só para isso: um
`time.Time` cru sairia como `"2026-09-01T00:00:00Z"` e quebraria toda tela que
faz `split("-")` na data.

Coberto por `tests/integration/schema_test.go`, que falha se um id virar objeto,
um valor virar string ou uma data virar timestamp.

## Consequências

- **Ganho real:** a soma de saldo passou a fechar em centavos, o banco recusa
  `"2026-02-30"`, e uma conta não aponta mais para categoria inexistente.
- **Id malformado continua devolvendo 404.** Com colunas `uuid`, um id como
  `"abc"` viraria erro de sintaxe (400). `sharedhttp.PathID` valida o formato
  antes e devolve 404, como era — igual a id inexistente, de outro dono ou
  apagado.
- **Select em branco vira `NULL`.** O cliente manda `""` num select vazio;
  `sqlbuilder` converte string vazia em `NULL` nas colunas terminadas em `_id`,
  porque com `uuid` + FK gravar `""` seria erro em vez de "nenhum".
- **`status` e `paid_at` andam juntos.** A coluna tem `CHECK` exigindo os dois
  em sincronia, e `syncPaidAt` mantém isso também no `PUT` parcial. No legado,
  despagar uma transação deixava a data antiga para trás e o relatório de pagos
  a contava de novo.
- **Não há `CHECK` ligando `is_recurring` a `recurrence_interval`.** Seria a
  regra correta, mas o `PUT` é parcial e o update em lote não lê o estado atual
  de cada linha: a constraint viveria quebrando em atualizações legítimas. Quem
  mantém os dois coerentes na criação é o service.

## O que reverteria

Nada previsível. Se um relatório precisar de mais de duas casas decimais em
moeda — câmbio, por exemplo — a escala de `numeric` sobe; a escolha do tipo
continua certa.
