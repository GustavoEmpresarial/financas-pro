-- Coleta automatica de erros: um lugar so pra ver o que quebrou, do backend
-- e do frontend, sem precisar entrar no container e ler log.

-- +goose Up

CREATE TABLE error_reports (
    id         uuid PRIMARY KEY,
    -- 'server' (panic ou erro 5xx capturado no proprio Go) ou 'client'
    -- (React: ErrorBoundary, window.onerror, promise rejeitada sem catch).
    source     text NOT NULL,
    level      text NOT NULL DEFAULT 'error',
    message    text NOT NULL,
    -- Stack trace ou goroutine dump, quando existe. Pode ser grande; sem
    -- limite de coluna, mas o backend trunca antes de gravar (ver
    -- server/modules/diagnostics/validation).
    stack      text,
    method     text,
    path       text,
    -- URL da tela no client, user agent, versao do app, etc. Livre por
    -- design -- o formato evolui sem migracao nova.
    context    jsonb,
    -- Nulo quando o erro acontece antes do login (crash na tela de auth) ou
    -- quando o token ja expirou no momento do report.
    user_id    uuid,
    created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT error_reports_source_check CHECK (source IN ('server', 'client')),
    CONSTRAINT error_reports_level_check  CHECK (level IN ('error', 'warning', 'fatal'))
);

CREATE INDEX error_reports_created_at_idx ON error_reports (created_at DESC);
CREATE INDEX error_reports_source_idx ON error_reports (source);

ALTER TABLE error_reports ADD CONSTRAINT error_reports_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- +goose Down

DROP TABLE IF EXISTS error_reports;
