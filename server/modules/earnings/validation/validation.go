// Package validation valida a entrada do modulo earnings.
package validation

import (
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	if err := validate.First(
		validate.Required(body, "sourceName", "Fonte"),
		validate.Required(body, "amount", "Valor"),
		validate.Positive(body, "amount", "Valor"),
		validate.Required(body, "date", "Data"),
		validate.Date(body, "date", "Data"),
	); err != nil {
		return err
	}
	validate.Default(body, "currency", "BRL")
	return nil
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "sourceName")
	return validate.First(
		validate.Positive(body, "amount", "Valor"),
		validate.Date(body, "date", "Data"),
	)
}
