// Package validation valida a entrada do modulo investments.
package validation

import (
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	return validate.First(
		validate.Required(body, "name", "Nome"),
		validate.NotNegative(body, "amountInvested", "Valor investido"),
		// currentValue pode ser 0 (investimento zerado) mas nao negativo.
		validate.NotNegative(body, "currentValue", "Valor atual"),
		validate.Date(body, "purchaseDate", "Data da compra"),
	)
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "name", "ticker")
	return validate.First(
		validate.NotNegative(body, "amountInvested", "Valor investido"),
		validate.NotNegative(body, "currentValue", "Valor atual"),
		validate.Date(body, "purchaseDate", "Data da compra"),
	)
}
