//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
)

// O schema passou de TEXT/DOUBLE/TEXT para date/numeric/uuid. Nada disso pode
// aparecer no JSON: o frontend e o mesmo de antes.
func TestTiposDoBancoNaoVazamNoJSON(t *testing.T) {
	c := newUser(t)
	acc := c.createID("/api/accounts", map[string]any{
		"name": "Corrente", "type": "checking", "balance": 1500.75,
	})
	c.createID("/api/transactions", map[string]any{
		"type": "expense", "amount": 189.90, "date": "2026-09-01",
		"title": "Mercado", "accountId": acc,
	})

	var out struct {
		Data []struct {
			ID     json.RawMessage `json:"id"`
			Amount json.RawMessage `json:"amount"`
			Date   json.RawMessage `json:"date"`
			PaidAt json.RawMessage `json:"paidAt"`
		} `json:"data"`
	}
	c.do("GET", "/api/transactions", nil, &out, http.StatusOK)
	if len(out.Data) != 1 {
		t.Fatalf("esperava 1 transacao, veio %d", len(out.Data))
	}
	tx := out.Data[0]

	// uuid -> string entre aspas, nao objeto.
	if string(tx.ID)[0] != '"' {
		t.Errorf("id deveria ser string JSON, veio %s", tx.ID)
	}
	// numeric -> numero, nao string. O cliente faz aritmetica com isso.
	if string(tx.Amount) != "189.9" && string(tx.Amount) != "189.90" {
		t.Errorf("amount deveria ser numero 189.9, veio %s", tx.Amount)
	}
	// date -> "AAAA-MM-DD", nunca um timestamp completo.
	if string(tx.Date) != `"2026-09-01"` {
		t.Errorf(`date deveria ser "2026-09-01", veio %s`, tx.Date)
	}
	// paid_at continua sendo instante, em ISO completo.
	if string(tx.PaidAt) == "null" || len(tx.PaidAt) < 20 {
		t.Errorf("paidAt deveria ser um instante ISO, veio %s", tx.PaidAt)
	}
}

// A soma acumulada no banco era o motivo de trocar DOUBLE por numeric: em
// float64, somar 0,10 dez vezes da 0,9999999999999999.
func TestSaldoNaoAcumulaErroDeArredondamento(t *testing.T) {
	c := newUser(t)
	acc := c.createID("/api/accounts", map[string]any{
		"name": "Centavos", "type": "checking", "balance": 0,
	})

	for i := 0; i < 10; i++ {
		c.createID("/api/earnings", map[string]any{
			"sourceName": "Troco", "amount": 0.10, "date": "2026-09-01", "accountId": acc,
		})
	}

	// Lido como texto direto do banco: sem passar por float em lugar nenhum.
	var exato string
	if err := pool.QueryRow(context.Background(),
		"SELECT balance::text FROM financial_accounts WHERE id = $1", acc).Scan(&exato); err != nil {
		t.Fatal(err)
	}
	if exato != "1.00" {
		t.Errorf("0,10 somado 10x deu %s, esperava exatamente 1.00", exato)
	}
}

// Dinheiro e arredondado para centavos pela propria coluna.
func TestValorEArredondadoParaCentavos(t *testing.T) {
	c := newUser(t)
	id := c.createID("/api/bills", map[string]any{
		"title": "Rateio", "amount": 33.333333, "dueDate": "2026-09-10",
	})
	var exato string
	if err := pool.QueryRow(context.Background(),
		"SELECT amount::text FROM bills WHERE id = $1", id).Scan(&exato); err != nil {
		t.Fatal(err)
	}
	if exato != "33.33" {
		t.Errorf("amount gravado %s, esperava 33.33", exato)
	}
}

// O banco agora recusa data que nao existe, e o erro chega como 400.
func TestDataInexistenteERecusada(t *testing.T) {
	c := newUser(t)
	var out struct{ Error string }
	c.do("POST", "/api/transactions", map[string]any{
		"type": "expense", "amount": 10, "date": "2026-02-30",
	}, &out, http.StatusBadRequest)
	if out.Error == "" {
		t.Error("esperava mensagem de erro")
	}
}

// Id malformado continua sendo 404, como antes das colunas virarem uuid — e
// nao um erro de sintaxe de uuid vazando como 400.
func TestIdMalformadoEQuatrocentosEQuatro(t *testing.T) {
	c := newUser(t)
	for _, path := range []string{
		"/api/categories/nao-e-um-uuid",
		"/api/accounts/123",
		"/api/transactions/abc",
		"/api/bills/xyz",
	} {
		c.do("PUT", path, map[string]any{"name": "X"}, nil, http.StatusNotFound)
		c.do("DELETE", path, nil, nil, http.StatusNotFound)
	}
}

// As FKs que faltavam em bills agora existem: apontar para uma categoria que
// nao existe e recusado, em vez de gravar um id orfao.
func TestBillNaoAceitaCategoriaInexistente(t *testing.T) {
	c := newUser(t)
	c.do("POST", "/api/bills", map[string]any{
		"title": "Luz", "amount": 100, "dueDate": "2026-09-10",
		"categoryId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
	}, nil, http.StatusBadRequest)
}

// Select em branco manda "": tem que virar NULL, e nao erro de uuid.
func TestIdVazioEGravadoComoNulo(t *testing.T) {
	c := newUser(t)
	id := c.createID("/api/bills", map[string]any{
		"title": "Agua", "amount": 80, "dueDate": "2026-09-10",
		"categoryId": "", "accountId": "",
	})
	var cat, acc *string
	if err := pool.QueryRow(context.Background(),
		"SELECT category_id::text, account_id::text FROM bills WHERE id = $1", id).Scan(&cat, &acc); err != nil {
		t.Fatal(err)
	}
	if cat != nil || acc != nil {
		t.Errorf("esperava NULL nos dois, veio category=%v account=%v", cat, acc)
	}
}

// status e paid_at precisam andar juntos: o CHECK exige, e o relatorio de
// pagos depende disso. No legado, despagar deixava a data antiga para tras.
func TestDespagarLimpaADataDePagamento(t *testing.T) {
	c := newUser(t)
	id := c.createID("/api/transactions", map[string]any{
		"type": "expense", "amount": 50, "date": "2026-09-01", "status": "paid",
	})

	var paidAt *string
	pool.QueryRow(context.Background(),
		"SELECT paid_at::text FROM transactions WHERE id = $1", id).Scan(&paidAt)
	if paidAt == nil {
		t.Fatal("transacao paga deveria ter paid_at")
	}

	c.do("PUT", "/api/transactions/"+id+"/status", map[string]any{"status": "pending"}, nil, http.StatusOK)
	pool.QueryRow(context.Background(),
		"SELECT paid_at::text FROM transactions WHERE id = $1", id).Scan(&paidAt)
	if paidAt != nil {
		t.Errorf("ao despagar, paid_at deveria ficar nulo, veio %v", *paidAt)
	}

	// E o mesmo pelo PUT comum, que e outro caminho de codigo.
	c.do("PUT", "/api/transactions/"+id, map[string]any{"status": "paid"}, nil, http.StatusOK)
	pool.QueryRow(context.Background(),
		"SELECT paid_at::text FROM transactions WHERE id = $1", id).Scan(&paidAt)
	if paidAt == nil {
		t.Error("ao pagar pelo PUT comum, paid_at deveria ser preenchido")
	}
}

// Os CHECKs de dominio recusam valor fora da regra mesmo que a validacao em Go
// deixe passar por algum caminho novo.
func TestBancoRecusaValoresForaDoDominio(t *testing.T) {
	c := newUser(t)
	casos := []struct {
		nome, path string
		body       map[string]any
	}{
		{"tipo de categoria invalido", "/api/categories", map[string]any{"name": "X", "type": "outro"}},
		{"tipo de conta invalido", "/api/accounts", map[string]any{"name": "X", "type": "cripto"}},
		{"valor negativo", "/api/bills", map[string]any{"title": "X", "amount": -5, "dueDate": "2026-09-01"}},
		{"dia de fechamento invalido", "/api/credit-cards", map[string]any{"name": "X", "totalLimit": 100, "closingDay": 40, "dueDay": 5}},
	}
	for _, caso := range casos {
		t.Run(caso.nome, func(t *testing.T) {
			c.do("POST", caso.path, caso.body, nil, http.StatusBadRequest)
		})
	}
}

// Transferencia para a mesma conta e barrada tambem no banco.
func TestTransferenciaParaMesmaContaERecusada(t *testing.T) {
	c := newUser(t)
	a := c.createID("/api/accounts", map[string]any{"name": "A", "type": "checking", "balance": 100})
	c.do("POST", "/api/transfers", map[string]any{
		"fromAccountId": a, "toAccountId": a, "amount": 10, "date": "2026-09-01",
	}, nil, http.StatusBadRequest)
}

// E-mail e unico sem depender de maiuscula/minuscula.
func TestEmailEUnicoIgnorandoCaixa(t *testing.T) {
	anon := &client{t: t}
	email := "Caixa" + randomSuffix() + "@Teste.com"
	anon.do("POST", "/api/auth/register", map[string]any{
		"email": email, "password": "segredo123",
	}, nil, http.StatusOK)
	anon.do("POST", "/api/auth/register", map[string]any{
		"email": email, "password": "segredo123",
	}, nil, http.StatusConflict)
}
