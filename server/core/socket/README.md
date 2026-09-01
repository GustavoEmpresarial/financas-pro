# core/socket — RESERVADO (vazio)

Sem uso hoje. O frontend usa apenas `@tanstack/react-query` com refetch; não há
nenhuma tela que precise de push do servidor.

**Quando preencher:** notificação de vencimento de conta em tempo real, ou
atualização de saldo ao vivo com o app aberto em mais de um dispositivo.

**O que entra aqui:** upgrade WebSocket (`coder/websocket` ou `gorilla/websocket`),
hub de conexões por `user_id` e o dispatch de eventos. Handlers de domínio
continuam em `modules/`.
