// Package query le parametros de querystring.
package query

import (
	"net/http"

	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/shared/dates"
)

// Month le um filtro de mes "YYYY-MM". Ausente devolve nil, que os SELECTs
// interpretam como "sem filtro".
//
// O legado nao validava o formato: um ?month=lixo virava uma comparacao de
// texto que silenciosamente nao casava com nada, e a tela mostrava lista vazia
// sem dizer por que. Aqui vira 400.
func Month(r *http.Request, key string) (*string, error) {
	v := r.URL.Query().Get(key)
	if v == "" {
		return nil, nil
	}
	if !dates.Valid(v + "-01") {
		return nil, httperrors.BadRequest("Mês precisa estar no formato AAAA-MM")
	}
	return &v, nil
}

// String le um parametro opcional. Vazio devolve nil.
func String(r *http.Request, key string) *string {
	v := r.URL.Query().Get(key)
	if v == "" {
		return nil
	}
	return &v
}
