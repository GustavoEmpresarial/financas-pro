GO      ?= go
BIN     := bin/api
PKG     := ./server/cmd/api
GOOSE   := goose -dir migrations postgres "$(DATABASE_URL)"

-include .env
export

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "};{printf "  \033[36m%-16s\033[0m %s\n",$$1,$$2}'

## --- backend ---
.PHONY: dev build run test lint tidy
dev: ## roda a API com reload manual (Ctrl-C + make dev)
	$(GO) run $(PKG)

build: ## compila o binario em bin/api
	CGO_ENABLED=0 $(GO) build -trimpath -ldflags="-s -w" -o $(BIN) $(PKG)

run: build ## compila e executa
	./$(BIN)

test: ## testes de unidade
	$(GO) test ./... -count=1

test-integration: ## sobe um Postgres descartavel e roda os testes de integracao
	./scripts/database/test-db.sh

lint: ## vet + formatacao
	$(GO) vet ./...
	@test -z "$$(gofmt -l server tests)" || (echo "gofmt pendente:"; gofmt -l server tests; exit 1)

tidy: ## organiza go.mod
	$(GO) mod tidy

## --- banco ---
.PHONY: migrate migrate-down migrate-status sqlc baseline
migrate: ## aplica migracoes pendentes
	$(GOOSE) up

migrate-down: ## desfaz a ultima migracao
	$(GOOSE) down

migrate-status: ## mostra o estado das migracoes
	$(GOOSE) status

baseline: ## marca a 00001 como aplicada num banco que ja existe (nao roda DDL)
	./scripts/database/mark-baseline.sh

sqlc: ## regera server/core/database/gen a partir de queries/
	sqlc generate

## --- client ---
.PHONY: client-install client-dev client-build client-test
client-install:
	cd client && npm install

client-dev:
	cd client && npm run dev

client-build:
	cd client && npm run build

client-test:
	cd client && npm run test

## --- docker ---
.PHONY: up down logs
up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f app
