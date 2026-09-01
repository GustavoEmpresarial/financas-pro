// Package reqctx guarda o valor por request (hoje, so o dono autenticado) num
// pacote que nao depende de HTTP nem de banco.
//
// Existe separado de core/http/middleware por causa de uma dependencia
// circular: middleware.Auth precisa gravar o userID, e
// core/http/responses precisa lê-lo (para anexar o dono num erro
// capturado por diagnostics), mas responses ja e importado por middleware
// (para renderizar 401). Um terceiro pacote sem dependencias quebra o
// ciclo — middleware e responses importam reqctx, nunca um ao outro por
// causa disto.
package reqctx

import "context"

type ctxKey string

const userIDKey ctxKey = "userID"

// UserID le o dono do request. So devolve valor depois do middleware Auth; em
// rota publica devolve "".
func UserID(ctx context.Context) string {
	id, _ := ctx.Value(userIDKey).(string)
	return id
}

// WithUserID injeta um dono no contexto. Usado pelo middleware.Auth ao
// validar o token, e por testes/jobs que rodam fora de um request HTTP.
func WithUserID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, userIDKey, id)
}
