// Package validation valida a entrada do modulo transfers.
package validation

import (
	"strings"

	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/modules/transfers/types"
	"financaspro/server/shared/dates"
)

func Create(r *types.CreateRequest) error {
	if strings.TrimSpace(r.FromAccountID) == "" || strings.TrimSpace(r.ToAccountID) == "" {
		return httperrors.BadRequest("Conta de origem e destino são obrigatórias")
	}
	if r.FromAccountID == r.ToAccountID {
		return httperrors.BadRequest("Contas de origem e destino devem ser diferentes")
	}
	if r.Amount <= 0 {
		return httperrors.BadRequest("Valor inválido")
	}
	if r.FeeOrZero() < 0 {
		return httperrors.BadRequest("Taxa não pode ser negativa")
	}
	if r.Date == "" {
		r.Date = dates.Today()
	}
	if !dates.Valid(r.Date) {
		return httperrors.BadRequest("Data precisa estar no formato AAAA-MM-DD")
	}
	return nil
}
