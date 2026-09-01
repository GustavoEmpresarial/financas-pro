package middleware

import (
	"bytes"
	"io"
	"net/http"
	"strings"

	"financaspro/server/shared/utils"
)

// maxBody limita o corpo JSON que o normalizador aceita ler inteiro na memoria.
// Upload nao passa por aqui: e multipart, nao application/json.
const maxBody = 4 << 20 // 4 MiB

// Normalize converte as chaves do corpo JSON de snake_case para camelCase,
// portando o hook preHandler do legado (server/src/app.ts).
//
// O cliente hoje ja manda camelCase, entao na pratica isso e defensivo: existia
// no legado, e tirar seria uma mudanca de contrato silenciosa para qualquer tela
// que ainda mande snake.
func Normalize(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body == nil || !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
			next.ServeHTTP(w, r)
			return
		}

		body, err := io.ReadAll(io.LimitReader(r.Body, maxBody))
		r.Body.Close()
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		normalized := utils.NormalizeJSON(body)
		r.Body = io.NopCloser(bytes.NewReader(normalized))
		r.ContentLength = int64(len(normalized))
		next.ServeHTTP(w, r)
	})
}
