// Package types define os DTOs do modulo subscriptions.
package types

// CreateRequest e o corpo de POST /api/subscriptions.
type CreateRequest struct {
	Name            string  `json:"name"`
	Amount          float64 `json:"amount"`
	Frequency       *string `json:"frequency"`
	CategoryID      *string `json:"categoryId"`
	AccountID       *string `json:"accountId"`
	PaymentMethodID *string `json:"paymentMethodId"`
	NextBillingDate *string `json:"nextBillingDate"`
	BillingDay      *int32  `json:"billingDay"`
	Notes           *string `json:"notes"`
	Color           *string `json:"color"`
	Icon            *string `json:"icon"`
	LogoURL         *string `json:"logoUrl"`
}

// ChargeRequest e o corpo de POST /api/subscriptions/charge/{id}.
type ChargeRequest struct {
	Date *string `json:"date"`
}
