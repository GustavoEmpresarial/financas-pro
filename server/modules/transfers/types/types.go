// Package types define a entrada do modulo transfers.
package types

// CreateRequest e o corpo de POST /api/transfers.
type CreateRequest struct {
	FromAccountID string   `json:"fromAccountId"`
	ToAccountID   string   `json:"toAccountId"`
	Amount        float64  `json:"amount"`
	Date          string   `json:"date"`
	Description   *string  `json:"description"`
	Fee           *float64 `json:"fee"`
}

// FeeOrZero trata taxa ausente como zero, como o legado (`body.fee || 0`).
func (r CreateRequest) FeeOrZero() float64 {
	if r.Fee == nil {
		return 0
	}
	return *r.Fee
}
