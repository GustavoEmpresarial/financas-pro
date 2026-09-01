// Package validation valida a entrada do modulo transactions.
//
// O legado tinha transactionCreateSchema em lib/validation.ts, mas o arquivo
// nao era importado pela rota — na pratica nada era validado. Aqui e.
package validation

import (
	"strings"

	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/modules/transactions/types"
	"financaspro/server/shared/dates"
)

var (
	Types       = []string{"income", "expense"}
	Statuses    = []string{"paid", "pending", "scheduled", "canceled"}
	Frequencies = []string{"weekly", "monthly", "quarterly", "yearly"}
)

func oneOf(v string, allowed []string) bool {
	for _, a := range allowed {
		if v == a {
			return true
		}
	}
	return false
}

func Create(r *types.CreateRequest) error {
	if r.Amount <= 0 {
		return httperrors.BadRequest("Valor precisa ser maior que zero")
	}
	if r.Date == "" {
		return httperrors.BadRequest("Data é obrigatória")
	}
	if !dates.Valid(r.Date) {
		return httperrors.BadRequest("Data precisa estar no formato AAAA-MM-DD")
	}
	if r.Type != nil && !oneOf(*r.Type, Types) {
		return httperrors.BadRequest("Tipo inválido: use income ou expense")
	}
	if r.Status != nil && !oneOf(*r.Status, Statuses) {
		return httperrors.BadRequest("Status inválido")
	}
	if r.RecurrenceInterval != nil && !oneOf(*r.RecurrenceInterval, Frequencies) {
		return httperrors.BadRequest("Recorrência inválida")
	}
	trimPtr(&r.Title)
	trimPtr(&r.Description)
	trimPtr(&r.Notes)
	return nil
}

// maxBulk limita a importacao de uma vez so. O legado nao tinha limite: um CSV
// grande virava um INSERT unico capaz de segurar a conexao por minutos.
const maxBulk = 500

func BulkCreate(r *types.BulkCreateRequest) error {
	if len(r.Transactions) == 0 {
		return httperrors.BadRequest("transactions é obrigatório e não pode ser vazio")
	}
	if len(r.Transactions) > maxBulk {
		return httperrors.BadRequest("Máximo de 500 transações por importação")
	}
	for i := range r.Transactions {
		if err := Create(&r.Transactions[i]); err != nil {
			return err
		}
	}
	return nil
}

func BulkIDs(ids []string) error {
	if len(ids) == 0 {
		return httperrors.BadRequest("ids é obrigatório e não pode ser vazio")
	}
	return nil
}

func Status(r *types.StatusRequest) error {
	if r.Status == "" {
		return httperrors.BadRequest("Status é obrigatório")
	}
	if !oneOf(r.Status, Statuses) {
		return httperrors.BadRequest("Status inválido")
	}
	return nil
}

func ConvertRecurring(r *types.ConvertRecurringRequest) error {
	if r.Frequency != nil && !oneOf(*r.Frequency, Frequencies) {
		return httperrors.BadRequest("Recorrência inválida")
	}
	return nil
}

// trimPtr normaliza e transforma string vazia em nulo, como o legado
// (`body.title?.trim() || null`).
func trimPtr(p **string) {
	if *p == nil {
		return
	}
	t := strings.TrimSpace(**p)
	if t == "" {
		*p = nil
		return
	}
	*p = &t
}
