// Package validation valida a entrada do modulo bills.
package validation

import (
	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/modules/bills/types"
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

var (
	statuses   = []string{"pending", "paid", "overdue", "postponed", "canceled"}
	priorities = []string{"low", "medium", "high"}
)

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	return validate.First(
		validate.Required(body, "title", "Título"),
		validate.Required(body, "amount", "Valor"),
		validate.Positive(body, "amount", "Valor"),
		validate.Required(body, "dueDate", "Vencimento"),
		validate.Date(body, "dueDate", "Vencimento"),
		validate.Date(body, "paidDate", "Data do pagamento"),
		validate.NotNegative(body, "paidAmount", "Valor pago"),
		validate.OneOf(body, "status", "Status", statuses...),
		validate.OneOf(body, "priority", "Prioridade", priorities...),
	)
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "title")
	return validate.First(
		validate.Positive(body, "amount", "Valor"),
		validate.Date(body, "dueDate", "Vencimento"),
		validate.Date(body, "paidDate", "Data do pagamento"),
		validate.NotNegative(body, "paidAmount", "Valor pago"),
		validate.OneOf(body, "status", "Status", statuses...),
		validate.OneOf(body, "priority", "Prioridade", priorities...),
	)
}

// maxParcels evita que um erro de digitacao gere milhares de contas.
// O legado nao tinha limite: parcels = 10000 criava 10 mil linhas.
const maxParcels = 120

func Postpone(r *types.PostponeRequest) error {
	m := r.MonthsOrOne()
	if m < 1 || m > 120 {
		return httperrors.BadRequest("Adiamento precisa ser de 1 a 120 meses")
	}
	return nil
}

func Split(r *types.SplitRequest) error {
	if r.Parcels < 2 {
		return httperrors.BadRequest("O parcelamento precisa ter ao menos 2 parcelas")
	}
	if r.Parcels > maxParcels {
		return httperrors.BadRequest("Máximo de 120 parcelas")
	}
	return nil
}
