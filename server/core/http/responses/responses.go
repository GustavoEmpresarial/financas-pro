// Package responses escreve os corpos de resposta.
//
// O envelope do backend legado e irregular e precisa continuar irregular, senao
// as telas quebram:
//
//	listagem   -> {"data": [...]}
//	mutacao    -> {"ok": true}  ou  {"data": {...}}
//	erro       -> {"error": "mensagem"}
//	auth       -> {"token": "...", "user": {...}}   (sem envelope nenhum)
//
// Nao "padronize" isso sem mexer no cliente junto.
package responses

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"financaspro/server/core/diagnostics"
	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/core/http/reqctx"
)

// JSON escreve v cru, sem envelope. Use quando a forma ja e o contrato inteiro
// (por exemplo /api/auth/login).
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// Header ja foi enviado: nao da para trocar o status. So registra.
		slog.Error("falha ao serializar resposta", "err", err)
	}
}

// Data envelopa em {"data": ...} com 200.
func Data(w http.ResponseWriter, v any) {
	JSON(w, http.StatusOK, map[string]any{"data": v})
}

// Created envelopa em {"data": ...} com 201.
func Created(w http.ResponseWriter, v any) {
	JSON(w, http.StatusCreated, map[string]any{"data": v})
}

// OK responde {"ok": true} — a forma que o legado usa em mutacao sem retorno.
func OK(w http.ResponseWriter) {
	JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// Error resolve o erro e responde {"error": "..."}.
//
// Erro 5xx tambem vai para o log com a causa real, e para a tabela de
// diagnostico (ver server/core/diagnostics) — o cliente so ve a mensagem
// generica nos dois casos.
func Error(w http.ResponseWriter, r *http.Request, log *slog.Logger, err error) {
	status, msg := httperrors.Resolve(err)
	if status >= 500 {
		if log != nil {
			log.Error("erro no handler",
				"err", err,
				"method", r.Method,
				"path", r.URL.Path,
			)
		}
		captureServerError(r, err.Error())
	}
	JSON(w, status, map[string]any{"error": msg})
}

func captureServerError(r *http.Request, message string) {
	var userID *string
	if id := reqctx.UserID(r.Context()); id != "" {
		userID = &id
	}
	diagnostics.Capture(r.Context(), diagnostics.Report{
		Source:  "server",
		Level:   "error",
		Message: message,
		Method:  r.Method,
		Path:    r.URL.Path,
		UserID:  userID,
	})
}
