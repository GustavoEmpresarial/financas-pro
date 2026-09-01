// Package types define os DTOs do modulo diagnostics.
package types

// ClientReportRequest e o corpo de POST /api/diagnostics/errors, enviado
// pelo frontend (ErrorBoundary, window.onerror, promise sem catch).
type ClientReportRequest struct {
	Level   string         `json:"level"`
	Message string         `json:"message"`
	Stack   string         `json:"stack"`
	Path    string         `json:"path"`
	Context map[string]any `json:"context"`
}
