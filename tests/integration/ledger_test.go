//go:build integration

package integration

import (
	"math"
	"net/http"
	"testing"
)

// quase compara float com tolerancia de meio centavo. Os valores sao
// DOUBLE PRECISION no banco (ver docs/decisions/0002), entao comparacao exata
// falharia por representacao binaria.
func quase(t *testing.T, got, want float64, contexto string) {
	t.Helper()
	if math.Abs(got-want) > 0.005 {
		t.Errorf("%s: saldo %.2f, esperava %.2f", contexto, got, want)
	}
}

// O saldo tem que fechar depois de cada operacao. E a invariante mais
// importante do sistema: se ela quebrar, o app mente sobre quanto o usuario
// tem, e nada no resto da tela denuncia isso.
func TestSaldoFechaAoLongoDoCicloDeVida(t *testing.T) {
	c := newUser(t)
	acc := c.createID("/api/accounts", map[string]any{
		"name": "Corrente", "type": "checking", "balance": 1000,
	})

	tx := c.createID("/api/transactions", map[string]any{
		"type": "expense", "amount": 250.50, "date": "2026-09-01",
		"title": "Mercado", "accountId": acc,
	})
	quase(t, c.balance(acc), 749.50, "apos despesa de 250,50")

	c.do("PUT", "/api/transactions/"+tx, map[string]any{"amount": 100}, nil, http.StatusOK)
	quase(t, c.balance(acc), 900, "apos reduzir para 100")

	c.do("PUT", "/api/transactions/"+tx, map[string]any{"type": "income"}, nil, http.StatusOK)
	quase(t, c.balance(acc), 1100, "apos virar receita")

	c.do("DELETE", "/api/transactions/"+tx, nil, nil, http.StatusOK)
	quase(t, c.balance(acc), 1000, "apos apagar: tem que voltar ao inicial")
}

func TestSaldoAcompanhaTrocaDeConta(t *testing.T) {
	c := newUser(t)
	a := c.createID("/api/accounts", map[string]any{"name": "A", "type": "checking", "balance": 500})
	b := c.createID("/api/accounts", map[string]any{"name": "B", "type": "savings", "balance": 500})

	tx := c.createID("/api/transactions", map[string]any{
		"type": "expense", "amount": 100, "date": "2026-09-01", "accountId": a,
	})
	quase(t, c.balance(a), 400, "A apos a despesa")
	quase(t, c.balance(b), 500, "B intacta")

	c.do("PUT", "/api/transactions/"+tx, map[string]any{"accountId": b}, nil, http.StatusOK)
	quase(t, c.balance(a), 500, "A devolvida ao mover a despesa")
	quase(t, c.balance(b), 400, "B assumiu a despesa")
}

func TestTransferenciaMoveDinheiroECobraTaxaDaOrigem(t *testing.T) {
	c := newUser(t)
	a := c.createID("/api/accounts", map[string]any{"name": "A", "type": "checking", "balance": 1000})
	b := c.createID("/api/accounts", map[string]any{"name": "B", "type": "savings", "balance": 0})

	id := c.createID("/api/transfers", map[string]any{
		"fromAccountId": a, "toAccountId": b, "amount": 200, "fee": 5, "date": "2026-09-01",
	})
	quase(t, c.balance(a), 795, "origem: valor + taxa")
	quase(t, c.balance(b), 200, "destino: so o valor, sem a taxa")

	c.do("DELETE", "/api/transfers/"+id, nil, nil, http.StatusOK)
	quase(t, c.balance(a), 1000, "origem restaurada")
	quase(t, c.balance(b), 0, "destino restaurado")
}

// O legado respondia 200 com {"ok": false} aqui. Como o cliente so olha o
// status HTTP, o erro passava batido e a tela parecia ter salvado.
func TestTransferenciaSemSaldoFalhaEnaoMexeEmNada(t *testing.T) {
	c := newUser(t)
	a := c.createID("/api/accounts", map[string]any{"name": "A", "type": "checking", "balance": 100})
	b := c.createID("/api/accounts", map[string]any{"name": "B", "type": "savings", "balance": 0})

	var errOut struct{ Error string }
	c.do("POST", "/api/transfers", map[string]any{
		"fromAccountId": a, "toAccountId": b, "amount": 500, "date": "2026-09-01",
	}, &errOut, http.StatusBadRequest)

	if errOut.Error == "" {
		t.Error("resposta de erro deveria trazer a mensagem em {\"error\": ...}")
	}
	quase(t, c.balance(a), 100, "origem nao pode ser tocada")
	quase(t, c.balance(b), 0, "destino nao pode ser tocado")
}

// A taxa conta para o saldo disponivel: transferir exatamente o saldo, com
// taxa, deixaria a conta negativa.
func TestTransferenciaConsideraATaxaNaChecagemDeSaldo(t *testing.T) {
	c := newUser(t)
	a := c.createID("/api/accounts", map[string]any{"name": "A", "type": "checking", "balance": 100})
	b := c.createID("/api/accounts", map[string]any{"name": "B", "type": "savings", "balance": 0})

	c.do("POST", "/api/transfers", map[string]any{
		"fromAccountId": a, "toAccountId": b, "amount": 100, "fee": 1, "date": "2026-09-01",
	}, nil, http.StatusBadRequest)
	quase(t, c.balance(a), 100, "origem intacta")
}

func TestGanhoCreditaEDescreditaAConta(t *testing.T) {
	c := newUser(t)
	acc := c.createID("/api/accounts", map[string]any{"name": "A", "type": "checking", "balance": 0})

	id := c.createID("/api/earnings", map[string]any{
		"sourceName": "Freela", "amount": 1500, "date": "2026-09-01", "accountId": acc,
	})
	quase(t, c.balance(acc), 1500, "apos o ganho")

	c.do("PUT", "/api/earnings/"+id, map[string]any{"amount": 2000}, nil, http.StatusOK)
	quase(t, c.balance(acc), 2000, "apos corrigir o valor")

	c.do("DELETE", "/api/earnings/"+id, nil, nil, http.StatusOK)
	quase(t, c.balance(acc), 0, "apos apagar")
}
