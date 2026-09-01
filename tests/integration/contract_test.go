//go:build integration

package integration

import (
	"encoding/json"
	"net/http"
	"testing"
)

// O formato das respostas e irregular por heranca do backend legado, e o
// cliente depende dessa irregularidade. Este teste trava as tres formas.
func TestEnvelopeDasRespostas(t *testing.T) {
	c := newUser(t)

	t.Run("listagem devolve {data: []}", func(t *testing.T) {
		var out map[string]json.RawMessage
		c.do("GET", "/api/categories", nil, &out, http.StatusOK)
		if _, ok := out["data"]; !ok {
			t.Errorf("faltou a chave data: %v", out)
		}
	})

	t.Run("criacao devolve {data: {}}", func(t *testing.T) {
		var out map[string]json.RawMessage
		c.do("POST", "/api/categories", map[string]any{"name": "X", "type": "expense"}, &out, http.StatusOK)
		if _, ok := out["data"]; !ok {
			t.Errorf("faltou a chave data: %v", out)
		}
	})

	t.Run("update devolve {ok: true}, nao o registro", func(t *testing.T) {
		id := c.createID("/api/categories", map[string]any{"name": "Y", "type": "expense"})
		var out struct {
			OK   bool            `json:"ok"`
			Data json.RawMessage `json:"data"`
		}
		c.do("PUT", "/api/categories/"+id, map[string]any{"name": "Z"}, &out, http.StatusOK)
		if !out.OK {
			t.Error("esperava ok:true")
		}
		if out.Data != nil {
			t.Error("update nao deve devolver data — o cliente invalida a query em vez de ler a resposta")
		}
	})

	t.Run("erro devolve {error: string}", func(t *testing.T) {
		var out struct{ Error string }
		c.do("POST", "/api/categories", map[string]any{"type": "expense"}, &out, http.StatusBadRequest)
		if out.Error == "" {
			t.Error("esperava a mensagem em error")
		}
	})

	t.Run("auth nao usa envelope", func(t *testing.T) {
		var out struct {
			Token string `json:"token"`
			User  struct {
				ID    string `json:"id"`
				Email string `json:"email"`
			} `json:"user"`
		}
		c.do("GET", "/api/auth/me", nil, nil, http.StatusOK)
		anon := &client{t: t}
		anon.do("POST", "/api/auth/register", map[string]any{
			"email": "envelope" + randomSuffix() + "@teste.com", "password": "segredo123",
		}, &out, http.StatusOK)
		if out.Token == "" || out.User.ID == "" {
			t.Errorf("register precisa devolver token e user na raiz: %+v", out)
		}
	})
}

// O browser decodifica o payload do JWT sem verificar assinatura e le
// payload.userId. Renomear esse claim desloga o usuario a cada F5, sem erro.
func TestClaimsDoTokenSaoOsQueOClienteLe(t *testing.T) {
	anon := &client{t: t}
	var out struct{ Token string }
	anon.do("POST", "/api/auth/register", map[string]any{
		"email": "claims" + randomSuffix() + "@teste.com", "password": "segredo123",
	}, &out, http.StatusOK)

	claims := decodePayload(t, out.Token)
	if _, ok := claims["userId"]; !ok {
		t.Error("o payload precisa ter userId — client/src/features/auth/hooks/useAuth.tsx devolve null sem ele")
	}
	if _, ok := claims["email"]; !ok {
		t.Error("o payload precisa ter email")
	}
	if _, ok := claims["exp"]; !ok {
		t.Error("o token precisa expirar")
	}
}

// A senha nunca pode sair numa resposta. O modelo gerado pelo sqlc tem o campo
// password_hash; e a projecao em modules/auth/types que impede o vazamento.
func TestSenhaNuncaAparece(t *testing.T) {
	c := newUser(t)
	for _, path := range []string{"/api/auth/me", "/api/profile"} {
		var raw json.RawMessage
		c.do("GET", path, nil, &raw, http.StatusOK)
		if containsAny(string(raw), "passwordHash", "password_hash", "password") {
			t.Errorf("%s vazou campo de senha: %s", path, raw)
		}
	}
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if len(sub) > 0 && len(s) >= len(sub) {
			for i := 0; i+len(sub) <= len(s); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}
