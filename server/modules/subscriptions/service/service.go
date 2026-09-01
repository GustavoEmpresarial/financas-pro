// Package service concentra a regra de negocio das assinaturas.
package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
	"financaspro/server/shared/crud"
	"financaspro/server/shared/dates"
	apperrors "financaspro/server/shared/errors"
	"financaspro/server/shared/sqlbuilder"
	"financaspro/server/shared/utils"
)

const Table = "recurring_subscriptions"

var Columns = sqlbuilder.NewColumns(
	"name", "amount", "frequency", "category_id", "account_id",
	"payment_method_id", "next_billing_date", "billing_day", "status",
	"is_active", "notes", "color", "icon", "logo_url",
)

type Service struct {
	pool *pgxpool.Pool
	q    *gen.Queries
}

func New(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool, q: gen.New(pool)}
}

func (s *Service) List(ctx context.Context, userID string) ([]gen.RecurringSubscription, error) {
	return s.q.ListSubscriptions(ctx, userID)
}

// Create grava a assinatura e ja lanca a primeira cobranca como transacao,
// como no legado.
//
// O legado fazia os dois inserts soltos e, pior, lia `body.category_id` e
// `body.account_id` em snake_case na hora de montar a transacao — depois do
// hook que ja tinha convertido tudo para camelCase. Resultado: a transacao da
// assinatura nascia sempre sem categoria e sem conta. Aqui os dois campos vao.
func (s *Service) Create(ctx context.Context, userID string, name string, amount float64, frequency string, params gen.CreateSubscriptionParams) (gen.RecurringSubscription, error) {
	var out gen.RecurringSubscription

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	sub, err := qtx.CreateSubscription(ctx, params)
	if err != nil {
		return out, err
	}

	chargeDate := dates.TodayDate()
	if params.NextBillingDate != nil && !params.NextBillingDate.IsZero() {
		chargeDate = *params.NextBillingDate
	}
	now := time.Now().UTC()

	if _, err := qtx.CreateTransaction(ctx, gen.CreateTransactionParams{
		ID:                 uuid.NewString(),
		UserID:             userID,
		Type:               "expense",
		Title:              &name,
		Description:        &name,
		Amount:             amount,
		CategoryID:         params.CategoryID,
		AccountID:          params.AccountID,
		PaymentMethodID:    params.PaymentMethodID,
		IsFixed:            true,
		IsRecurring:        true,
		RecurrenceInterval: &frequency,
		PaymentMethod:      "pix",
		Date:               chargeDate,
		Status:             "paid",
		PaidAt:             &now,
		SubscriptionID:     &sub.ID,
		Tags:               []string{},
	}); err != nil {
		return out, err
	}

	if err := tx.Commit(ctx); err != nil {
		return out, err
	}
	return sub, nil
}

func (s *Service) Update(ctx context.Context, userID, id string, body crud.Body) error {
	// status e is_active andam juntos: o legado sincronizava os dois no PUT, e
	// a tela filtra por is_active.
	if status, ok := body["status"].(string); ok {
		body["isActive"] = status == "active"
	}

	patch := sqlbuilder.NewPatch(body, Columns, utils.CamelToSnake)
	query, args, err := patch.UpdateOwned(Table, id, userID)
	if err != nil {
		return err
	}
	tag, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperrors.ErrNotFound
	}
	return nil
}

func (s *Service) Delete(ctx context.Context, userID, id string) error {
	rows, err := s.q.SoftDeleteSubscription(ctx, gen.SoftDeleteSubscriptionParams{ID: id, UserID: userID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperrors.ErrNotFound
	}
	return nil
}

// Charge lanca uma cobranca: cria a transacao, registra em subscription_charges
// e avanca next_billing_date. Os tres passos numa transacao so.
func (s *Service) Charge(ctx context.Context, userID, id string, date *string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	sub, err := qtx.GetSubscription(ctx, gen.GetSubscriptionParams{ID: id, UserID: userID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperrors.ErrNotFound
		}
		return err
	}

	chargeDate := dates.TodayDate()
	if date != nil && *date != "" {
		parsed, err := dates.ParseDate(*date)
		if err != nil {
			return apperrors.ErrInvalidInput
		}
		chargeDate = parsed
	} else if sub.NextBillingDate != nil && !sub.NextBillingDate.IsZero() {
		chargeDate = *sub.NextBillingDate
	}

	now := time.Now().UTC()
	txn, err := qtx.CreateTransaction(ctx, gen.CreateTransactionParams{
		ID:                 uuid.NewString(),
		UserID:             userID,
		Type:               "expense",
		Title:              &sub.Name,
		Description:        &sub.Name,
		Amount:             sub.Amount,
		CategoryID:         sub.CategoryID,
		AccountID:          sub.AccountID,
		PaymentMethodID:    sub.PaymentMethodID,
		IsFixed:            true,
		IsRecurring:        true,
		RecurrenceInterval: &sub.Frequency,
		PaymentMethod:      "pix",
		Date:               chargeDate,
		Status:             "paid",
		PaidAt:             &now,
		SubscriptionID:     &sub.ID,
		Tags:               []string{},
	})
	if err != nil {
		return err
	}

	if _, err := qtx.CreateSubscriptionCharge(ctx, gen.CreateSubscriptionChargeParams{
		ID:             uuid.NewString(),
		UserID:         userID,
		SubscriptionID: sub.ID,
		TransactionID:  &txn.ID,
		Amount:         sub.Amount,
		ChargeDate:     chargeDate,
		Status:         "paid",
	}); err != nil {
		return err
	}

	next := AdvanceDate(chargeDate, sub.Frequency, sub.BillingDay)
	if _, err := qtx.MarkSubscriptionCharged(ctx, gen.MarkSubscriptionChargedParams{
		ID:              id,
		UserID:          userID,
		LastChargedAt:   &chargeDate,
		NextBillingDate: &next,
	}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// AdvanceDate calcula a proxima cobranca a partir da atual.
//
// billingDay e o dia do mes contratado; quando informado, ele — e nao o dia da
// ultima cobranca — define o alvo. Isso importa porque o dia pode ter sido
// reduzido por um mes curto: uma assinatura do dia 31 cobrada em 28/02 deve
// voltar para 31/03, nao seguir no dia 28 para sempre.
//
// Porte do advanceDate do legado, com duas correcoes:
//   - la, 31/01 + 1 mes virava 03/03, porque o Date do JavaScript normaliza o
//     estouro de dia; aqui o dia e preso ao ultimo dia do mes;
//   - la, o dia vinha sempre da data da cobranca, entao o desvio acumulava a
//     cada mes curto.
func AdvanceDate(date dates.Date, frequency string, billingDay *int32) dates.Date {
	day := date.Day()
	if billingDay != nil && *billingDay >= 1 && *billingDay <= 31 {
		day = int(*billingDay)
	}

	switch frequency {
	case "weekly":
		// Semanal e a unica frequencia que nao ancora em dia do mes.
		return dates.NewDate(date.Time().AddDate(0, 0, 7))
	case "quarterly":
		return date.AddMonthsFixingDay(3, day)
	case "yearly":
		return date.AddMonthsFixingDay(12, day)
	default: // monthly
		return date.AddMonthsFixingDay(1, day)
	}
}
