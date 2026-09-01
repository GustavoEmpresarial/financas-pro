// Package errors traduz erro de dominio para status HTTP e mensagem em
// portugues — as mesmas mensagens do backend legado.
package errors

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	apperrors "financaspro/server/shared/errors"
)

// AppError e um erro que ja sabe com que status quer sair.
type AppError struct {
	Status  int
	Message string
	err     error
}

func (e *AppError) Error() string { return e.Message }
func (e *AppError) Unwrap() error { return e.err }

func New(status int, msg string) *AppError { return &AppError{Status: status, Message: msg} }

func BadRequest(msg string) *AppError   { return New(http.StatusBadRequest, msg) }
func Unauthorized(msg string) *AppError { return New(http.StatusUnauthorized, msg) }
func NotFound(msg string) *AppError     { return New(http.StatusNotFound, msg) }
func Conflict(msg string) *AppError     { return New(http.StatusConflict, msg) }

// Resolve decide status e mensagem para qualquer erro que chegue ao controller.
//
// A ordem importa: AppError explicito ganha de tudo; depois os sentinelas de
// dominio; so entao o erro cru do driver. Erro nao reconhecido vira 500 com
// mensagem generica — detalhe de banco nao vaza para o cliente, vai para o log.
func Resolve(err error) (int, string) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Status, appErr.Message
	}

	switch {
	case errors.Is(err, apperrors.ErrNotFound), errors.Is(err, pgx.ErrNoRows):
		return http.StatusNotFound, "Registro não encontrado"
	case errors.Is(err, apperrors.ErrConflict):
		return http.StatusConflict, "Registro já existe"
	case errors.Is(err, apperrors.ErrUnauthorized):
		return http.StatusUnauthorized, "Não autorizado"
	case errors.Is(err, apperrors.ErrInvalidInput):
		return http.StatusBadRequest, "Dados inválidos"
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505": // unique_violation
			return http.StatusConflict, "Registro já existe"
		case "23503": // foreign_key_violation
			return http.StatusBadRequest, "Referência inválida"
		case "23502": // not_null_violation
			return http.StatusBadRequest, "Campo obrigatório ausente"
		case "22P02": // invalid_text_representation — uuid ou numero malformado
			return http.StatusBadRequest, "Dados inválidos"
		case "22008": // datetime_field_overflow — ex.: "2026-02-30"
			return http.StatusBadRequest, "Data inválida"
		case "23514": // check_violation — uma regra do schema foi violada
			return http.StatusBadRequest, "Dados inválidos"
		}
	}

	return http.StatusInternalServerError, "Erro interno"
}
