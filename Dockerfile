# ---------------------------------------------------------------- 1. client
FROM node:22-alpine AS client
WORKDIR /client

# package.json antes do resto: o npm ci so refaz quando as dependencias mudam.
COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ---------------------------------------------------------------- 2. server
FROM golang:1.27-alpine AS server
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY server/ ./server/

# CGO desligado: binario estatico, roda no alpine sem libc externa.
# -trimpath tira o caminho da maquina de build do binario.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./server/cmd/api

# ------------------------------------------------------------- 3. migracoes
FROM golang:1.27-alpine AS goose
RUN go install github.com/pressly/goose/v3/cmd/goose@v3.27.3

# ------------------------------------------------------------------ 4. final
FROM alpine:3.21

# ca-certificates para chamadas HTTPS de saida; tzdata porque as datas de
# negocio dependem do fuso local (America/Sao_Paulo).
RUN apk add --no-cache ca-certificates tzdata \
 && adduser -D -u 10001 app

WORKDIR /app

COPY --from=server /out/api           /app/api
COPY --from=goose  /go/bin/goose      /usr/local/bin/goose
COPY --from=client /client/dist       /app/public
COPY migrations/                      /app/migrations/
COPY scripts/deploy/entrypoint.sh     /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh && mkdir -p /uploads && chown -R app /uploads /app

USER app

ENV PORT=9101 \
    HOST=0.0.0.0 \
    UPLOAD_DIR=/uploads \
    PUBLIC_DIR=/app/public

EXPOSE 9101

# Sem shell no CMD: o processo Go vira PID 1 e recebe o SIGTERM do docker
# stop, que e o que dispara o shutdown gracioso.
ENTRYPOINT ["/app/entrypoint.sh"]
