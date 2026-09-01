// Package http traz helpers de leitura de request usados pelos controllers.
package http

import (
	"encoding/json"
	"net/http"

	httperrors "financaspro/server/core/http/errors"
)

// Decode le o corpo JSON em v.
//
// DisallowUnknownFields fica DESLIGADO de proposito: o cliente manda campos a
// mais em varias telas (e o legado, sem schema, aceitava tudo). Campo
// desconhecido e ignorado; a protecao contra mass-assignment vem de os DTOs
// simplesmente nao terem id/userId/createdAt, nao de recusar o request.
func Decode(r *http.Request, v any) error {
	if r.Body == nil {
		return httperrors.BadRequest("Corpo da requisição vazio")
	}
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return httperrors.BadRequest("JSON inválido")
	}
	return nil
}
