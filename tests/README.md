# tests — testes que atravessam camadas

Teste de unidade mora junto do código (`*_test.go` ao lado do pacote), como é
idiomático em Go. Esta pasta é só para o que precisa de banco ou de browser.

- `integration/` — sobe um Postgres real e exercita `create → list → update →
  soft delete → list` por módulo. **Preenchido na Fase 4.**
- `e2e/` — RESERVADO. App inteiro de pé, dirigido pelo browser. Vazio até haver
  um fluxo que valha o custo de manter.
- `fixtures/` — dados de apoio (dumps SQL, JSONs de payload). Preenchido junto
  com `integration/`.
