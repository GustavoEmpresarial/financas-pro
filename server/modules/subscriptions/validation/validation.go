// Package validation valida a entrada do modulo subscriptions.
package validation

import (
	"strings"

	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/modules/subscriptions/types"
	"financaspro/server/shared/crud"
	"financaspro/server/shared/dates"
	"financaspro/server/shared/validate"
)

// Frequencies sao os valores que advanceDate do legado sabia tratar. Um valor
// fora da lista caia no ramo default ("mensal") sem avisar ninguem.
var Frequencies = []string{"weekly", "monthly", "quarterly", "yearly"}

var statuses = []string{"active", "paused", "canceled"}

func Create(r *types.CreateRequest) error {
	r.Name = strings.TrimSpace(r.Name)
	if r.Name == "" {
		return httperrors.BadRequest("Nome é obrigatório")
	}
	if r.Amount <= 0 {
		return httperrors.BadRequest("Valor precisa ser maior que zero")
	}
	if r.Frequency != nil && !contains(Frequencies, *r.Frequency) {
		return httperrors.BadRequest("Frequência inválida: use weekly, monthly, quarterly ou yearly")
	}
	if r.NextBillingDate != nil && *r.NextBillingDate != "" && !dates.Valid(*r.NextBillingDate) {
		return httperrors.BadRequest("Próxima cobrança precisa estar no formato AAAA-MM-DD")
	}
	if r.BillingDay != nil && (*r.BillingDay < 1 || *r.BillingDay > 31) {
		return httperrors.BadRequest("Dia de cobrança precisa ser entre 1 e 31")
	}
	return nil
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "name")
	return validate.First(
		validate.Positive(body, "amount", "Valor"),
		validate.OneOf(body, "frequency", "Frequência", Frequencies...),
		validate.OneOf(body, "status", "Status", statuses...),
		validate.Date(body, "nextBillingDate", "Próxima cobrança"),
	)
}

func Charge(r *types.ChargeRequest) error {
	if r.Date != nil && *r.Date != "" && !dates.Valid(*r.Date) {
		return httperrors.BadRequest("Data precisa estar no formato AAAA-MM-DD")
	}
	return nil
}

func contains(list []string, v string) bool {
	for _, item := range list {
		if item == v {
			return true
		}
	}
	return false
}
