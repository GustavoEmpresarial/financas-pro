// Package validation valida a entrada do modulo users.
package validation

import (
	"strings"

	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/modules/users/types"
)

// themes sao os valores que o next-themes usa no cliente.
var themes = map[string]bool{"light": true, "dark": true, "system": true}

func UpdateProfile(r *types.UpdateProfileRequest) error {
	if r.ThemePreference != nil && !themes[*r.ThemePreference] {
		return httperrors.BadRequest("Tema inválido: use light, dark ou system")
	}
	if r.DisplayName != nil {
		trimmed := strings.TrimSpace(*r.DisplayName)
		r.DisplayName = &trimmed
	}
	return nil
}
