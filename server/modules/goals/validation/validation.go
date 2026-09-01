// Package validation valida a entrada do modulo goals.
package validation

import (
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

var (
	priorities = []string{"low", "medium", "high"}
	statuses   = []string{"active", "completed", "paused", "cancelled"}
)

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	return validate.First(
		validate.Required(body, "name", "Nome"),
		validate.Positive(body, "targetAmount", "Valor alvo"),
		validate.NotNegative(body, "currentAmount", "Valor atual"),
		validate.NotNegative(body, "monthlyTarget", "Meta mensal"),
		validate.Date(body, "deadline", "Prazo"),
		validate.OneOf(body, "priority", "Prioridade", priorities...),
		validate.OneOf(body, "status", "Status", statuses...),
	)
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "name")
	return validate.First(
		validate.Positive(body, "targetAmount", "Valor alvo"),
		validate.NotNegative(body, "currentAmount", "Valor atual"),
		validate.NotNegative(body, "monthlyTarget", "Meta mensal"),
		validate.Date(body, "deadline", "Prazo"),
		validate.OneOf(body, "priority", "Prioridade", priorities...),
		validate.OneOf(body, "status", "Status", statuses...),
	)
}
