// Package types define os DTOs do modulo bills.
package types

// PostponeRequest e o corpo de POST /api/bills/{id}/postpone.
type PostponeRequest struct {
	Months *int `json:"months"`
}

// MonthsOrOne trata ausencia como 1 mes, como o legado (`months ?? 1`).
func (r PostponeRequest) MonthsOrOne() int {
	if r.Months == nil {
		return 1
	}
	return *r.Months
}

// SplitRequest e o corpo de POST /api/bills/{id}/split.
type SplitRequest struct {
	Parcels int `json:"parcels"`
}
