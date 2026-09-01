// Package errors define os erros sentinela que os services usam para dizer o
// que aconteceu sem conhecer HTTP. A traducao para status code fica em
// core/http/errors.
package errors

import "errors"

var (
	ErrNotFound     = errors.New("registro nao encontrado")
	ErrConflict     = errors.New("registro ja existe")
	ErrUnauthorized = errors.New("nao autorizado")
	ErrInvalidInput = errors.New("dados invalidos")
)

// Is e As reexportados para o pacote de dominio nao precisar importar os dois.
var (
	Is = errors.Is
	As = errors.As
)
