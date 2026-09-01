package middleware

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"financaspro/server/core/diagnostics"
	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/core/http/responses"
)

// fakeReporter grava os Reports recebidos, para o teste inspecionar sem
// precisar de banco.
type fakeReporter struct{ got []diagnostics.Report }

func (f *fakeReporter) Report(_ context.Context, r diagnostics.Report) { f.got = append(f.got, r) }

func silentLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(nopWriter{}, nil))
}

type nopWriter struct{}

func (nopWriter) Write(p []byte) (int, error) { return len(p), nil }

// Um panic no handler tem que virar 500 para o cliente E um Report nivel
// "fatal" com stack trace, sem derrubar o processo.
func TestRecoverCapturaPanicComoFatal(t *testing.T) {
	fake := &fakeReporter{}
	diagnostics.Set(fake)
	t.Cleanup(func() { diagnostics.Reset() })

	handler := Recover(silentLogger())(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("boom: saldo indefinido")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/accounts", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, esperava 500", rec.Code)
	}

	// Report roda em goroutine (ver service.Report) -- aqui o fake grava
	// sincrono porque o teste substitui o Reporter direto, sem passar pelo
	// service de verdade. Se isso mudar, o teste precisa de um wait.
	if len(fake.got) != 1 {
		t.Fatalf("esperava 1 report, veio %d", len(fake.got))
	}
	got := fake.got[0]
	if got.Level != "fatal" {
		t.Errorf("level = %q, esperava fatal", got.Level)
	}
	if got.Source != "server" {
		t.Errorf("source = %q, esperava server", got.Source)
	}
	if got.Stack == "" {
		t.Error("stack vazio: sem ele nao da para saber onde panicou")
	}
	if got.Path != "/api/accounts" {
		t.Errorf("path = %q, esperava /api/accounts", got.Path)
	}
}

// Um erro 500 comum (nao panic) tambem tem que ser capturado, com level
// "error" -- distinto do "fatal" do panic.
func TestResponsesErrorCapturaQuinhentos(t *testing.T) {
	fake := &fakeReporter{}
	diagnostics.Set(fake)
	t.Cleanup(func() { diagnostics.Reset() })

	req := httptest.NewRequest(http.MethodGet, "/api/transactions", nil)
	rec := httptest.NewRecorder()
	responses.Error(rec, req, silentLogger(), errors.New("conexao com o banco recusada"))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, esperava 500", rec.Code)
	}
	if len(fake.got) != 1 {
		t.Fatalf("esperava 1 report, veio %d", len(fake.got))
	}
	if fake.got[0].Level != "error" {
		t.Errorf("level = %q, esperava error", fake.got[0].Level)
	}
}

// Erro 400 (regra de negocio, nao bug) NAO deve virar um report -- senao a
// tabela de diagnostico enche de "categoria invalida" e "senha errada" em vez
// de guardar so o que e de fato bug.
func TestResponsesErrorNaoCapturaQuatrocentos(t *testing.T) {
	fake := &fakeReporter{}
	diagnostics.Set(fake)
	t.Cleanup(func() { diagnostics.Reset() })

	req := httptest.NewRequest(http.MethodPost, "/api/categories", nil)
	rec := httptest.NewRecorder()
	responses.Error(rec, req, silentLogger(), httperrors.BadRequest("Nome é obrigatório"))

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, esperava 400", rec.Code)
	}
	if len(fake.got) != 0 {
		t.Fatalf("400 nao deveria gerar report, veio %d", len(fake.got))
	}
}
