//go:build integration

// Package integration exercita a API inteira contra um Postgres de verdade.
//
// Rodar:
//
//	TEST_DATABASE_URL=postgres://... go test ./tests/integration/... -tags=integration
//
// ou simplesmente `make test-integration`, que sobe um Postgres descartavel.
//
// Sem TEST_DATABASE_URL os testes sao pulados, para `go test ./...` continuar
// funcionando numa maquina sem banco.
package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/bootstrap"
	"financaspro/server/core/config"
	"financaspro/server/core/logger"
	"financaspro/server/shared/security"
)

var (
	pool   *pgxpool.Pool
	server *httptest.Server
)

func TestMain(m *testing.M) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		fmt.Println("TEST_DATABASE_URL nao definida; pulando testes de integracao")
		os.Exit(0)
	}

	ctx := context.Background()
	var err error
	pool, err = pgxpool.New(ctx, dsn)
	if err != nil {
		fmt.Fprintln(os.Stderr, "erro abrindo o banco:", err)
		os.Exit(1)
	}
	if err := pool.Ping(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "banco inacessivel:", err)
		os.Exit(1)
	}

	app := &bootstrap.App{
		Config: &config.Config{
			JWTSecret: "segredo-de-teste",
			UploadDir: os.TempDir(),
			PublicDir: os.TempDir(),
		},
		Log:    logger.New("error"),
		DB:     pool,
		Signer: security.NewSigner("segredo-de-teste"),
	}
	server = httptest.NewServer(app.Router())

	code := m.Run()
	server.Close()
	pool.Close()
	os.Exit(code)
}

// --------------------------------------------------------------- utilidades

type client struct {
	t     *testing.T
	token string
}

// newUser registra um usuario novo e devolve um cliente autenticado como ele.
func newUser(t *testing.T) *client {
	t.Helper()
	c := &client{t: t}
	email := fmt.Sprintf("u%s@teste.com", randomSuffix())
	var out struct{ Token string }
	c.do("POST", "/api/auth/register", map[string]any{
		"email": email, "password": "segredo123",
	}, &out, http.StatusOK)
	c.token = out.Token
	return c
}

var counter int

func randomSuffix() string {
	counter++
	return fmt.Sprintf("%d-%d", os.Getpid(), counter)
}

// do executa a chamada e confere o status. out pode ser nil.
func (c *client) do(method, path string, body any, out any, wantStatus int) {
	c.t.Helper()

	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			c.t.Fatal(err)
		}
		reader = strings.NewReader(string(b))
	}

	req, err := http.NewRequest(method, server.URL+path, reader)
	if err != nil {
		c.t.Fatal(err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != wantStatus {
		c.t.Fatalf("%s %s: status %d, esperava %d — corpo: %s", method, path, res.StatusCode, wantStatus, raw)
	}
	if out != nil {
		if err := json.Unmarshal(raw, out); err != nil {
			c.t.Fatalf("%s %s: resposta nao e JSON valido: %s", method, path, raw)
		}
	}
}

// createID cria um recurso e devolve o id de dentro de {"data": {...}}.
func (c *client) createID(path string, body any) string {
	c.t.Helper()
	var out struct {
		Data struct{ ID string } `json:"data"`
	}
	c.do("POST", path, body, &out, http.StatusOK)
	if out.Data.ID == "" {
		c.t.Fatalf("POST %s nao devolveu um id", path)
	}
	return out.Data.ID
}

// balance le o saldo direto do banco, sem passar pela API.
func (c *client) balance(accountID string) float64 {
	c.t.Helper()
	var b float64
	err := pool.QueryRow(context.Background(),
		"SELECT balance FROM financial_accounts WHERE id = $1", accountID).Scan(&b)
	if err != nil {
		c.t.Fatal(err)
	}
	return b
}
