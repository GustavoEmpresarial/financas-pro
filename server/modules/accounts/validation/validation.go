// Package validation valida a entrada do modulo accounts.
package validation

import (
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

// accountTypes vem do comentario do schema.prisma no modelo FinancialAccount.
var accountTypes = []string{"checking", "savings", "investment", "wallet"}

// balance nao passa por Positive nem NotNegative de proposito: conta corrente
// no vermelho e saldo negativo legitimo. So exigimos que seja numero.
func checkBalance(body validate.Body) error {
	_, _, err := validate.Number(body, "balance", "Saldo")
	return err
}

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	return validate.First(
		validate.Required(body, "name", "Nome"),
		validate.Required(body, "type", "Tipo"),
		validate.OneOf(body, "type", "Tipo", accountTypes...),
		checkBalance(body),
	)
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "name")
	return validate.First(
		validate.OneOf(body, "type", "Tipo", accountTypes...),
		checkBalance(body),
	)
}
