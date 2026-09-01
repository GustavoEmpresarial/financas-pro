# e2e — vazio de proposito

Nao ha teste de browser. A cobertura hoje vem de duas camadas mais baratas:

- `../integration/` sobe a API inteira contra um Postgres real e trava as
  invariantes que mais importam (saldo, isolamento por dono, formato das
  respostas);
- `../../client/tests/contracts.test.ts` confere que cada hook expoe os campos
  que as telas esperam.

**Quando preencher:** se algum fluxo de varias telas quebrar mais de uma vez —
importacao de CSV e o candidato mais provavel. Antes disso, um Playwright para
manter nao se paga num app de uso pessoal.
