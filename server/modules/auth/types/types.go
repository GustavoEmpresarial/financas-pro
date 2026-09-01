// Package types define os DTOs de entrada e saida do modulo auth.
package types

import "time"

type RegisterRequest struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	DisplayName *string `json:"displayName"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// User e a projecao publica do usuario.
//
// Existe para que password_hash nunca possa sair numa resposta: o modelo gerado
// pelo sqlc tem o campo e serializaria ele. Nao troque isso por gen.User.
type User struct {
	ID          string     `json:"id"`
	Email       string     `json:"email"`
	DisplayName *string    `json:"displayName"`
	CreatedAt   *time.Time `json:"createdAt,omitempty"`
}

// AuthResponse e o corpo de /register e /login. Sem envelope: o cliente le
// data.token e data.user direto (client/src/shared/services/api.ts).
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// MeResponse e o corpo de GET /api/auth/me.
type MeResponse struct {
	User User `json:"user"`
}
