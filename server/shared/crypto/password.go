// Package crypto embrulha o hash de senha.
package crypto

import "golang.org/x/crypto/bcrypt"

// bcryptCost e 12, o mesmo do legado (lib/jwt.ts). Nao mude: hashes ja gravados
// carregam o custo dentro deles e continuariam validando, mas manter igual
// evita que senhas novas fiquem mais fracas que as antigas por engano.
const bcryptCost = 12

func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcryptCost)
	return string(b), err
}

func ComparePassword(plain, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
