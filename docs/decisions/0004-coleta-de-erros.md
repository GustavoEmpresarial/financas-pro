# 0004 — Coleta automática de erros, sem serviço externo

**Data:** 2026-09-01 · **Status:** aceito

## Contexto

Até aqui, um erro só aparecia em dois lugares: o log do container (`docker
logs`, que exige acesso SSH à VM para ler) e uma tela branca no navegador do
usuário, sem detalhe nenhum. Um crash de render em produção — como o que
derrubava a tela de Contas (erro React #310, ver histórico) — não deixava
rastro nenhum além do próprio usuário reportar "travou".

## Decisão

Um sistema de coleta próprio, sem Sentry nem equivalente: uma tabela
(`error_reports`), um endpoint de escrita e um de leitura, um
`ErrorBoundary` de verdade no React (não existia nenhum — um crash de render
derrubava a árvore inteira sem aviso), e uma tela no app para consultar.

**Servidor → banco, sem passar pela rede.** `server/core/diagnostics` é um
pacote neutro com um `Reporter` que `core/http/responses.Error` (todo 5xx) e
`core/http/middleware.Recover` (todo panic) chamam direto. Quem implementa
esse `Reporter` é `server/modules/diagnostics`, registrado uma vez no boot —
`core/http` nunca importa um módulo de domínio, a dependência é invertida de
propósito (documentado no próprio pacote).

**Cliente → HTTP → banco**, via `POST /api/diagnostics/errors`, alimentado por
três fontes: o `ErrorBoundary` (crash de render), `window.onerror` e
`unhandledrejection` (erro fora de render — timer, listener, promise sem
`.catch()`).

## Por que a rota de escrita é pública

Um crash na tela de login não tem token nenhum para mandar junto — e é
exatamente esse tipo de erro que mais importa não perder, porque acontece
antes de qualquer coisa. `middleware.OptionalAuth` tenta identificar o dono
se um `Authorization` válido vier, mas nunca exige um. O limite de tamanho
(`server/modules/diagnostics/validation`) é quem impede que isso vire uma
forma barata de encher a tabela: mensagem, stack e contexto são truncados
antes de gravar, sem exceção.

## Por que não é assíncrono via fila

Um `Report` grava numa goroutine própria, com `context.Background()` e
timeout de 5s — não o contexto do request, que pode morrer antes da escrita
terminar. Isso já desacopla o suficiente para uma tabela que recebe no
máximo alguns erros por dia num app pessoal. Fila (`server/workers`,
reservado) seria over-engineering para este volume.

## O que fica para depois

- **Sem limpeza automática.** `repository.DeleteOlderThan` existe e não é
  chamado por nada — candidato natural para `server/cron/jobs`, hoje vazio,
  no dia em que a tabela crescer o suficiente para importar.
- **Dedupe é só no cliente.** `errorReporter.ts` não reenvia a mesma
  mensagem+rota dentro de 10s (evita um componente em loop de crash virar
  uma requisição por frame), mas o servidor aceita qualquer volume que chegue
  — não há rate limit por IP nem por usuário. Aceitável hoje porque o app
  não é público; reavaliar se isso mudar.
