//go:build integration

package integration

import (
	"context"
	"net/http"
	"testing"
)

// O app e single-user por design, mas o backend aceita varias contas. Toda
// query precisa filtrar por dono; um vazamento aqui e o pior defeito possivel
// num app de financas.
func TestUsuarioNaoEnxergaDadoDeOutro(t *testing.T) {
	alice := newUser(t)
	bob := newUser(t)

	accID := alice.createID("/api/accounts", map[string]any{"name": "Secreta", "type": "checking", "balance": 10})
	catID := alice.createID("/api/categories", map[string]any{"name": "Privada", "type": "expense"})

	var list struct {
		Data []map[string]any `json:"data"`
	}
	bob.do("GET", "/api/accounts", nil, &list, http.StatusOK)
	if len(list.Data) != 0 {
		t.Errorf("bob viu %d contas de alice", len(list.Data))
	}

	// Editar e apagar respondem 404, e nao 403: 403 confirmaria que o id existe.
	bob.do("PUT", "/api/accounts/"+accID, map[string]any{"name": "Invadida"}, nil, http.StatusNotFound)
	bob.do("DELETE", "/api/categories/"+catID, nil, nil, http.StatusNotFound)

	var name string
	if err := pool.QueryRow(context.Background(),
		"SELECT name FROM financial_accounts WHERE id = $1", accID).Scan(&name); err != nil {
		t.Fatal(err)
	}
	if name != "Secreta" {
		t.Errorf("a conta de alice virou %q", name)
	}
}

// O corpo do request nao pode escolher o dono do registro. E o que o
// stripProtected do legado tentava garantir, de forma inconsistente.
func TestCorpoNaoConsegueForjarDono(t *testing.T) {
	alice := newUser(t)
	bob := newUser(t)

	var me struct {
		User struct{ ID string } `json:"user"`
	}
	bob.do("GET", "/api/auth/me", nil, &me, http.StatusOK)

	id := alice.createID("/api/goals", map[string]any{
		"name": "Viagem", "targetAmount": 5000,
		"userId": me.User.ID, // tentativa de criar ja no nome do bob
	})

	var owner string
	if err := pool.QueryRow(context.Background(),
		"SELECT user_id FROM financial_goals WHERE id = $1", id).Scan(&owner); err != nil {
		t.Fatal(err)
	}
	if owner == me.User.ID {
		t.Fatal("o userId do corpo definiu o dono do registro")
	}

	// Um PUT so com userId nem chega ao banco: a allowlist descarta o campo e
	// sobra um patch vazio, que e recusado.
	alice.do("PUT", "/api/goals/"+id, map[string]any{"userId": me.User.ID}, nil, http.StatusBadRequest)

	// Junto de um campo legitimo, o update passa — mas o userId e ignorado.
	alice.do("PUT", "/api/goals/"+id, map[string]any{
		"name": "Viagem 2027", "userId": me.User.ID,
	}, nil, http.StatusOK)
	if err := pool.QueryRow(context.Background(),
		"SELECT user_id FROM financial_goals WHERE id = $1", id).Scan(&owner); err != nil {
		t.Fatal(err)
	}
	if owner == me.User.ID {
		t.Fatal("o userId do corpo transferiu a posse no update")
	}
}

func TestRotaProtegidaExigeToken(t *testing.T) {
	anon := &client{t: t}
	for _, path := range []string{
		"/api/accounts", "/api/transactions", "/api/bills",
		"/api/categories", "/api/profile", "/api/subscriptions",
	} {
		anon.do("GET", path, nil, nil, http.StatusUnauthorized)
	}
}

// Apagar e logico: o registro some das listagens mas continua na tabela.
func TestDeleteELogicoENaoFisico(t *testing.T) {
	c := newUser(t)
	id := c.createID("/api/investments", map[string]any{
		"name": "Tesouro", "amountInvested": 1000, "currentValue": 1000,
	})
	c.do("DELETE", "/api/investments/"+id, nil, nil, http.StatusOK)

	var list struct {
		Data []map[string]any `json:"data"`
	}
	c.do("GET", "/api/investments", nil, &list, http.StatusOK)
	if len(list.Data) != 0 {
		t.Errorf("o registro apagado ainda aparece na listagem")
	}

	var deleted *string
	if err := pool.QueryRow(context.Background(),
		"SELECT deleted_at::text FROM investments WHERE id = $1", id).Scan(&deleted); err != nil {
		t.Fatalf("a linha sumiu da tabela: %v", err)
	}
	if deleted == nil {
		t.Error("a linha continua na tabela mas sem deleted_at")
	}

	// Apagar de novo tem que ser 404, e nao um segundo 200 silencioso.
	c.do("DELETE", "/api/investments/"+id, nil, nil, http.StatusNotFound)
}
