// Package validation valida as entradas do modulo auth.
package validation

import (
	"strings"

	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/modules/auth/types"
)

// minPasswordLen e uma regra nova: o legado aceitava qualquer senha nao vazia.
// Endurecer nao quebra ninguem porque so afeta cadastro novo — o login continua
// aceitando qualquer hash ja gravado.
const minPasswordLen = 8

func Register(r *types.RegisterRequest) error {
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	if r.Email == "" || r.Password == "" {
		return httperrors.BadRequest("Email e senha obrigatórios")
	}
	if !strings.Contains(r.Email, "@") {
		return httperrors.BadRequest("Email inválido")
	}
	if len(r.Password) < minPasswordLen {
		return httperrors.BadRequest("A senha precisa ter ao menos 8 caracteres")
	}
	if r.DisplayName != nil {
		trimmed := strings.TrimSpace(*r.DisplayName)
		if trimmed == "" {
			r.DisplayName = nil
		} else {
			r.DisplayName = &trimmed
		}
	}
	return nil
}

func Login(r *types.LoginRequest) error {
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	if r.Email == "" || r.Password == "" {
		return httperrors.BadRequest("Email e senha obrigatórios")
	}
	return nil
}
