// Package types define a entrada do modulo users (perfil do usuario).
package types

// UpdateProfileRequest e o corpo de PUT /api/profile.
//
// Ponteiro em todo campo para distinguir "nao mandei" de "mandei vazio": o
// UPDATE usa COALESCE, entao nil mantem o valor atual.
type UpdateProfileRequest struct {
	DisplayName     *string `json:"displayName"`
	AvatarURL       *string `json:"avatarUrl"`
	ThemePreference *string `json:"themePreference"`
}
