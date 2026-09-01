// Package validation valida a entrada do modulo payment_methods.
package validation

import (
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

// paymentTypes vem do comentario do schema.prisma no modelo PaymentMethod.
var paymentTypes = []string{"credit_card", "debit_card", "cash", "pix", "transfer", "other"}

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	return validate.First(
		validate.Required(body, "name", "Nome"),
		validate.Required(body, "type", "Tipo"),
		validate.OneOf(body, "type", "Tipo", paymentTypes...),
	)
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "name")
	return validate.OneOf(body, "type", "Tipo", paymentTypes...)
}
