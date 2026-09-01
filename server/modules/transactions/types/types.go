// Package types define os DTOs do modulo transactions.
package types

// CreateRequest e o corpo de POST /api/transactions.
//
// Quase tudo e ponteiro porque quase tudo tem default no service, e "0"
// precisa ser distinguivel de "nao mandei".
type CreateRequest struct {
	Type               *string  `json:"type"`
	Title              *string  `json:"title"`
	Amount             float64  `json:"amount"`
	CategoryID         *string  `json:"categoryId"`
	SubcategoryID      *string  `json:"subcategoryId"`
	Description        *string  `json:"description"`
	Notes              *string  `json:"notes"`
	Date               string   `json:"date"`
	IsFixed            *bool    `json:"isFixed"`
	PaymentMethod      *string  `json:"paymentMethod"`
	PaymentMethodID    *string  `json:"paymentMethodId"`
	CreditCardID       *string  `json:"creditCardId"`
	AccountID          *string  `json:"accountId"`
	Status             *string  `json:"status"`
	IsRecurring        *bool    `json:"isRecurring"`
	RecurrenceInterval *string  `json:"recurrenceInterval"`
	Tags               []string `json:"tags"`
	InstallmentCount   *int32   `json:"installmentCount"`
	InstallmentNumber  *int32   `json:"installmentNumber"`
	InstallmentGroup   *string  `json:"installmentGroup"`

	// CreateSubscription pede que a transacao tambem vire uma assinatura
	// recorrente. So tem efeito junto com IsRecurring.
	CreateSubscription bool `json:"createSubscription"`
}

// BulkCreateRequest e o corpo de POST /api/transactions/bulk (importacao CSV).
type BulkCreateRequest struct {
	Transactions []CreateRequest `json:"transactions"`
}

// BulkUpdateRequest e o corpo de PUT /api/transactions/bulk.
type BulkUpdateRequest struct {
	IDs     []string       `json:"ids"`
	Updates map[string]any `json:"updates"`
}

// BulkDeleteRequest e o corpo de DELETE /api/transactions/bulk.
type BulkDeleteRequest struct {
	IDs []string `json:"ids"`
}

// StatusRequest e o corpo de PUT /api/transactions/{id}/status.
type StatusRequest struct {
	Status string `json:"status"`
}

// ConvertRecurringRequest e o corpo de POST /api/transactions/{id}/convert-recurring.
type ConvertRecurringRequest struct {
	Frequency *string `json:"frequency"`
}
