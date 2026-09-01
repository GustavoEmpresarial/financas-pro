// Package security assina e valida os tokens de sessao.
package security

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// tokenTTL replica o "7d" do legado (lib/jwt.ts).
const tokenTTL = 7 * 24 * time.Hour

// Claims usa os nomes exatos do backend legado: `userId` e `email`.
//
// NAO renomeie. O browser decodifica o payload cru em
// client/src/features/auth/hooks/useAuth.tsx e retorna null se `payload.userId`
// nao existir — o efeito de renomear e o usuario ficar deslogado depois de dar
// F5, sem nenhum erro no console.
type Claims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type Signer struct{ secret []byte }

func NewSigner(secret string) *Signer { return &Signer{secret: []byte(secret)} }

func (s *Signer) Sign(userID, email string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
}

var ErrInvalidToken = errors.New("token invalido ou expirado")

func (s *Signer) Verify(token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.secret, nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, ErrInvalidToken
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid || claims.UserID == "" {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
