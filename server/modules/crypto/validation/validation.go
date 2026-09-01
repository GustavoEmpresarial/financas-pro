// Package validation valida a entrada do modulo crypto.
package validation

import (
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	return validate.First(
		validate.Required(body, "name", "Nome"),
		validate.Required(body, "symbol", "Símbolo"),
		validate.Positive(body, "quantity", "Quantidade"),
		validate.NotNegative(body, "avgPrice", "Preço médio"),
		validate.NotNegative(body, "currentPrice", "Preço atual"),
		validate.Date(body, "purchaseDate", "Data da compra"),
	)
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "name", "symbol")
	return validate.First(
		validate.Positive(body, "quantity", "Quantidade"),
		validate.NotNegative(body, "avgPrice", "Preço médio"),
		validate.NotNegative(body, "currentPrice", "Preço atual"),
		validate.Date(body, "purchaseDate", "Data da compra"),
	)
}
