// Package validation valida a entrada do modulo alt_investments.
package validation

import (
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

// earningTypes vem do comentario do schema.prisma em AltInvestmentEarning.
var earningTypes = []string{"dividend", "interest", "redemption", "appreciation"}

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	return validate.First(
		validate.Required(body, "name", "Nome"),
		validate.NotNegative(body, "investedAmount", "Valor investido"),
		validate.NotNegative(body, "currentValue", "Valor atual"),
		validate.Date(body, "purchaseDate", "Data da compra"),
		validate.Date(body, "maturityDate", "Data de vencimento"),
	)
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "name")
	return validate.First(
		validate.NotNegative(body, "investedAmount", "Valor investido"),
		validate.NotNegative(body, "currentValue", "Valor atual"),
		validate.Date(body, "purchaseDate", "Data da compra"),
		validate.Date(body, "maturityDate", "Data de vencimento"),
	)
}

// CreateEarning valida o sub-recurso /alt-investments/{id}/earnings.
func CreateEarning(b *crud.Body) error {
	body := validate.Body(*b)
	return validate.First(
		validate.Required(body, "amount", "Valor"),
		validate.Positive(body, "amount", "Valor"),
		validate.Required(body, "type", "Tipo"),
		validate.OneOf(body, "type", "Tipo", earningTypes...),
		validate.Required(body, "date", "Data"),
		validate.Date(body, "date", "Data"),
	)
}
