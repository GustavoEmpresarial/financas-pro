// Package validation valida a entrada do modulo credit_cards.
package validation

import (
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	return validate.First(
		validate.Required(body, "name", "Nome"),
		validate.Positive(body, "totalLimit", "Limite total"),
		// Dia de fechamento e de vencimento sao dia do mes.
		validate.IntRange(body, "closingDay", "Dia de fechamento", 1, 31),
		validate.IntRange(body, "dueDay", "Dia de vencimento", 1, 31),
	)
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "name")
	return validate.First(
		validate.Positive(body, "totalLimit", "Limite total"),
		validate.IntRange(body, "closingDay", "Dia de fechamento", 1, 31),
		validate.IntRange(body, "dueDay", "Dia de vencimento", 1, 31),
	)
}
