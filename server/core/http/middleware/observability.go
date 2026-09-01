package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"financaspro/server/core/diagnostics"
	"financaspro/server/core/http/reqctx"
	"financaspro/server/core/http/responses"
)

// statusWriter guarda o status para o log, ja que http.ResponseWriter nao expoe.
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.ResponseWriter.Write(b)
}

// RequestLogger loga uma linha por request concluido.
func RequestLogger(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			sw := &statusWriter{ResponseWriter: w}
			next.ServeHTTP(sw, r)
			log.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", sw.status,
				"ms", time.Since(start).Milliseconds(),
			)
		})
	}
}

// Recover transforma panic em 500 com o mesmo corpo dos outros erros, em vez de
// derrubar a conexao sem resposta.
func Recover(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					stack := string(debug.Stack())
					log.Error("panic no handler",
						"panic", rec,
						"method", r.Method,
						"path", r.URL.Path,
						"stack", stack,
					)
					var userID *string
					if id := reqctx.UserID(r.Context()); id != "" {
						userID = &id
					}
					diagnostics.Capture(r.Context(), diagnostics.Report{
						Source:  "server",
						Level:   "fatal",
						Message: fmt.Sprintf("panic: %v", rec),
						Stack:   stack,
						Method:  r.Method,
						Path:    r.URL.Path,
						UserID:  userID,
					})
					responses.JSON(w, http.StatusInternalServerError, map[string]any{"error": "Erro interno"})
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
