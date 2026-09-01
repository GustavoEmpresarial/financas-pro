package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	apperrors "financaspro/server/shared/errors"
)

// PathID le um id da URL e confere que e um uuid.
//
// Um id malformado devolve ErrNotFound, que vira 404 — o mesmo que um id
// inexistente, de outro dono ou ja apagado. Sao todos "esse registro nao existe
// para voce", e responder diferente em cada caso entregaria informacao.
//
// Sem essa checagem, agora que as colunas sao uuid, um id como "abc" chegaria
// ao Postgres e voltaria como erro de sintaxe — 400 com "Dados inválidos", o
// que muda o contrato para pior sem motivo.
func PathID(r *http.Request, param string) (string, error) {
	id := chi.URLParam(r, param)
	if id == "" {
		return "", apperrors.ErrNotFound
	}
	if _, err := uuid.Parse(id); err != nil {
		return "", apperrors.ErrNotFound
	}
	return id, nil
}
