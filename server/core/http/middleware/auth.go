// Package middleware traz os middlewares HTTP transversais.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"financaspro/server/core/http/reqctx"
	"financaspro/server/core/http/responses"
	"financaspro/server/shared/security"
)

// Auth exige um Bearer valido e injeta o userID no contexto.
//
// As duas mensagens de 401 sao as mesmas do legado (middleware/auth.ts). O
// cliente nao le o texto — trata qualquer 401 como logout — mas manter igual
// deixa o contract-diff limpo.
func Auth(signer *security.Signer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				responses.JSON(w, http.StatusUnauthorized, map[string]any{"error": "Token não informado"})
				return
			}
			claims, err := signer.Verify(strings.TrimPrefix(header, "Bearer "))
			if err != nil {
				responses.JSON(w, http.StatusUnauthorized, map[string]any{"error": "Token inválido ou expirado"})
				return
			}
			ctx := reqctx.WithUserID(r.Context(), claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuth le o Bearer se ele vier, e injeta o userID no contexto — mas
// nunca bloqueia o request por falta ou invalidez do token.
//
// Existe so para o endpoint publico de diagnostics: um crash antes do login
// nao tem token (e continua sendo aceito), mas um crash de quem ja esta
// logado deve ficar associado a essa conta quando o token estiver presente e
// valido. Nenhuma outra rota deveria usar isto — se o dono importa para a
// logica do handler, use Auth, que recusa requisicao sem token valido.
func OptionalAuth(signer *security.Signer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				next.ServeHTTP(w, r)
				return
			}
			claims, err := signer.Verify(strings.TrimPrefix(header, "Bearer "))
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			ctx := reqctx.WithUserID(r.Context(), claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserID le o dono do request. Reexporta reqctx.UserID para o resto do
// codigo continuar chamando middleware.UserID(ctx), como sempre chamou —
// so a implementacao mudou de lugar (ver core/http/reqctx).
func UserID(ctx context.Context) string { return reqctx.UserID(ctx) }

// WithUserID injeta um dono no contexto. Existe para os testes e para jobs de
// cron, que rodam fora de um request HTTP.
func WithUserID(ctx context.Context, id string) context.Context {
	return reqctx.WithUserID(ctx, id)
}
