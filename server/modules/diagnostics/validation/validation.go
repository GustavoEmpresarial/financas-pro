// Package validation valida e limita o tamanho do que o cliente reporta.
//
// O endpoint de escrita e publico (ver module.go) -- um crash acontece antes
// do login tambem, e e exatamente esse tipo de erro que mais precisa ser
// visto. Sem exigir sessao, o limite de tamanho e quem impede que isso vire
// uma forma barata de encher o banco.
package validation

import (
	"strings"

	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/modules/diagnostics/types"
)

// Nao sao numeros escolhidos ao acaso: message e o teto de uma linha de
// erro razoavel; stack cobre um stack trace de React/V8 completo sem cortar
// no meio do que importa; context e um punhado de campos curtos (url,
// user agent, versao). Acima disso e sinal de payload malformado, nao de
// erro legitimo maior.
const (
	maxMessageLen = 2000
	maxStackLen   = 8000
	maxContextLen = 4000
)

var validLevels = map[string]bool{"error": true, "warning": true, "fatal": true}

func ClientReport(r *types.ClientReportRequest) error {
	r.Message = strings.TrimSpace(r.Message)
	if r.Message == "" {
		return httperrors.BadRequest("Mensagem é obrigatória")
	}
	if len(r.Message) > maxMessageLen {
		r.Message = r.Message[:maxMessageLen]
	}
	if len(r.Stack) > maxStackLen {
		r.Stack = r.Stack[:maxStackLen]
	}
	if r.Level == "" {
		r.Level = "error"
	}
	if !validLevels[r.Level] {
		return httperrors.BadRequest("Nível inválido: use error, warning ou fatal")
	}
	return nil
}

// TruncateContext corta o JSON serializado do context se vier grande demais.
// Roda depois do marshal porque o limite e em bytes serializados, nao em
// numero de chaves do mapa.
func TruncateContext(b []byte) []byte {
	if len(b) <= maxContextLen {
		return b
	}
	return []byte("{}")
}
