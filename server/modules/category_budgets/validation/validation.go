// Package validation valida a entrada do modulo category_budgets.
package validation

import (
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	return validate.First(
		validate.Required(body, "categoryId", "Categoria"),
		validate.Required(body, "month", "Mês"),
		validate.Month(body, "month", "Mês"),
		validate.Required(body, "amount", "Valor"),
		validate.Positive(body, "amount", "Valor"),
	)
}
