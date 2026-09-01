// Package service concentra a regra de negocio das transacoes.
//
// Todas as operacoes que mexem em saldo rodam dentro de uma transacao de banco.
// No legado eram UPDATEs soltos: editar uma transacao com conta vinculada fazia
// ate quatro escritas independentes em financial_accounts, e uma falha no meio
// deixava o saldo errado em silencio.
package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financaspro/server/core/database/gen"
	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/modules/transactions/types"
	"financaspro/server/shared/dates"
	apperrors "financaspro/server/shared/errors"
	"financaspro/server/shared/ledger"
	"financaspro/server/shared/sqlbuilder"
	"financaspro/server/shared/utils"
)

// Table e Columns valem para o PUT parcial, que continua generico.
const Table = "transactions"

var Columns = sqlbuilder.NewColumns(
	"type", "title", "amount", "category_id", "subcategory_id", "description",
	"notes", "date", "is_fixed", "payment_method", "payment_method_id",
	"credit_card_id", "account_id", "status", "is_recurring",
	"recurrence_interval", "paid_at", "tags", "installment_count",
	"installment_number", "installment_group",
)

type Service struct {
	pool *pgxpool.Pool
	q    *gen.Queries
}

func New(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool, q: gen.New(pool)}
}

func (s *Service) List(ctx context.Context, userID string, month, txType *string) ([]gen.ListTransactionsRow, error) {
	return s.q.ListTransactions(ctx, gen.ListTransactionsParams{
		UserID: userID,
		Type:   txType,
		Month:  month,
	})
}

// defaults aplica os mesmos valores implicitos do legado.
//
// Devolve erro so pela conversao da data; a validacao ja garantiu o formato,
// entao na pratica isso nunca dispara — mas engolir o erro esconderia um bug
// de ordem de chamada.
func defaults(r *types.CreateRequest) (gen.CreateTransactionParams, error) {
	txType := deref(r.Type, "expense")
	status := deref(r.Status, "paid")
	isRecurring := derefBool(r.IsRecurring, false)

	// title cai para description, e some se os dois estiverem vazios.
	title := r.Title
	if title == nil {
		title = r.Description
	}

	// recurrenceInterval so existe se a transacao e recorrente. Deixar um
	// intervalo pendurado numa transacao avulsa confunde o relatorio de fixos.
	var interval *string
	if isRecurring {
		v := deref(r.RecurrenceInterval, "monthly")
		interval = &v
	}

	// paid_at acompanha o status. A coluna tem CHECK garantindo os dois em
	// sincronia, entao isso deixou de ser so convencao.
	var paidAt *time.Time
	if status == "paid" {
		now := time.Now().UTC()
		paidAt = &now
	}

	tags := r.Tags
	if tags == nil {
		tags = []string{}
	}

	date, err := dates.ParseDate(r.Date)
	if err != nil {
		return gen.CreateTransactionParams{}, httperrors.BadRequest("Data precisa estar no formato AAAA-MM-DD")
	}

	return gen.CreateTransactionParams{
		ID:                 uuid.NewString(),
		Type:               txType,
		Title:              title,
		Amount:             r.Amount,
		CategoryID:         emptyToNil(r.CategoryID),
		SubcategoryID:      emptyToNil(r.SubcategoryID),
		Description:        r.Description,
		Notes:              r.Notes,
		Date:               date,
		IsFixed:            derefBool(r.IsFixed, false),
		PaymentMethod:      deref(r.PaymentMethod, "pix"),
		PaymentMethodID:    emptyToNil(r.PaymentMethodID),
		CreditCardID:       emptyToNil(r.CreditCardID),
		AccountID:          emptyToNil(r.AccountID),
		Status:             status,
		IsRecurring:        isRecurring,
		RecurrenceInterval: interval,
		PaidAt:             paidAt,
		Tags:               tags,
		InstallmentCount:   r.InstallmentCount,
		InstallmentNumber:  r.InstallmentNumber,
		InstallmentGroup:   emptyToNil(r.InstallmentGroup),
	}, nil
}

func (s *Service) Create(ctx context.Context, userID string, r types.CreateRequest) (gen.Transaction, error) {
	var out gen.Transaction

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	params, err := defaults(&r)
	if err != nil {
		return out, err
	}
	params.UserID = userID

	created, err := qtx.CreateTransaction(ctx, params)
	if err != nil {
		return out, err
	}

	if err := ledger.Apply(ctx, qtx, created.AccountID, userID, ledger.Delta(created.Type, created.Amount)); err != nil {
		return out, err
	}

	if r.CreateSubscription && created.IsRecurring {
		if err := s.spawnSubscription(ctx, qtx, userID, created, created.RecurrenceInterval); err != nil {
			return out, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return out, err
	}
	return created, nil
}

// spawnSubscription cria a assinatura a partir de uma transacao e liga as duas.
func (s *Service) spawnSubscription(ctx context.Context, q *gen.Queries, userID string, t gen.Transaction, frequency *string) error {
	name := "Despesa recorrente"
	if t.Title != nil && *t.Title != "" {
		name = *t.Title
	} else if t.Description != nil && *t.Description != "" {
		name = *t.Description
	}

	freq := deref(frequency, "monthly")
	day := billingDay(t.Date)

	sub, err := q.CreateSubscription(ctx, gen.CreateSubscriptionParams{
		ID:                  uuid.NewString(),
		UserID:              userID,
		Name:                name,
		Amount:              t.Amount,
		Frequency:           freq,
		CategoryID:          t.CategoryID,
		AccountID:           t.AccountID,
		NextBillingDate:     &t.Date,
		BillingDay:          day,
		Status:              "active",
		IsActive:            true,
		SourceTransactionID: &t.ID,
	})
	if err != nil {
		return err
	}

	_, err = q.SetTransactionSubscription(ctx, gen.SetTransactionSubscriptionParams{
		ID:                 t.ID,
		UserID:             userID,
		SubscriptionID:     &sub.ID,
		RecurrenceInterval: &freq,
	})
	return err
}

// BulkCreate grava varias transacoes de uma vez (importacao de CSV).
//
// Nao mexe em saldo, igual ao legado: o import traz historico, e aplicar cada
// linha ao saldo atual bagunçaria contas ja conciliadas.
func (s *Service) BulkCreate(ctx context.Context, userID string, items []types.CreateRequest) (int, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	for i := range items {
		params, err := defaults(&items[i])
		if err != nil {
			return 0, err
		}
		params.UserID = userID
		if _, err := qtx.CreateTransaction(ctx, params); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return len(items), nil
}

func (s *Service) Update(ctx context.Context, userID, id string, body map[string]any) error {
	syncPaidAt(body)

	patch := sqlbuilder.NewPatch(body, Columns, utils.CamelToSnake)
	query, args, err := patch.UpdateOwned(Table, id, userID)
	if err != nil {
		return err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	old, err := qtx.GetTransaction(ctx, gen.GetTransactionParams{ID: id, UserID: userID})
	if err != nil {
		return notFound(err)
	}
	// Desfaz o efeito antigo, grava, aplica o novo. Assim mudar de conta, de
	// tipo ou de valor acerta as duas contas envolvidas.
	if err := ledger.Revert(ctx, qtx, old.AccountID, userID, old.Type, old.Amount); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, query, args...); err != nil {
		return err
	}
	updated, err := qtx.GetTransaction(ctx, gen.GetTransactionParams{ID: id, UserID: userID})
	if err != nil {
		return notFound(err)
	}
	if err := ledger.Apply(ctx, qtx, updated.AccountID, userID, ledger.Delta(updated.Type, updated.Amount)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// BulkUpdate aplica o mesmo patch a varios ids.
//
// Nao ajusta saldo, como no legado: e usado para reclassificar em massa
// (mudar categoria, marcar como fixa), nao para mexer em valor.
func (s *Service) BulkUpdate(ctx context.Context, userID string, ids []string, updates map[string]any) error {
	syncPaidAt(updates)

	if sqlbuilder.NewPatch(updates, Columns, utils.CamelToSnake).Empty() {
		// Nenhuma coluna valida no patch: nada a fazer, e nao e erro — o legado
		// tambem aceitava updates vazio sem reclamar.
		return nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, id := range ids {
		query, args, err := sqlbuilder.NewPatch(updates, Columns, utils.CamelToSnake).UpdateOwned(Table, id, userID)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, query, args...); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *Service) Delete(ctx context.Context, userID, id string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	old, err := qtx.GetTransaction(ctx, gen.GetTransactionParams{ID: id, UserID: userID})
	if err != nil {
		return notFound(err)
	}
	if err := ledger.Revert(ctx, qtx, old.AccountID, userID, old.Type, old.Amount); err != nil {
		return err
	}
	rows, err := qtx.SoftDeleteTransaction(ctx, gen.SoftDeleteTransactionParams{ID: id, UserID: userID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperrors.ErrNotFound
	}
	return tx.Commit(ctx)
}

// BulkDelete apaga varias e reverte o saldo de cada uma.
func (s *Service) BulkDelete(ctx context.Context, userID string, ids []string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	items, err := qtx.ListTransactionsByIDs(ctx, gen.ListTransactionsByIDsParams{Ids: ids, UserID: userID})
	if err != nil {
		return err
	}
	for _, t := range items {
		if err := ledger.Revert(ctx, qtx, t.AccountID, userID, t.Type, t.Amount); err != nil {
			return err
		}
	}
	if _, err := qtx.SoftDeleteTransactionsBulk(ctx, gen.SoftDeleteTransactionsBulkParams{Ids: ids, UserID: userID}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Service) SetStatus(ctx context.Context, userID, id, status string) error {
	rows, err := s.q.UpdateTransactionStatus(ctx, gen.UpdateTransactionStatusParams{
		ID:     id,
		UserID: userID,
		Status: status,
		PaidAt: time.Now().UTC(),
	})
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperrors.ErrNotFound
	}
	return nil
}

// ConvertRecurring transforma uma transacao existente em assinatura.
func (s *Service) ConvertRecurring(ctx context.Context, userID, id string, frequency *string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	t, err := qtx.GetTransaction(ctx, gen.GetTransactionParams{ID: id, UserID: userID})
	if err != nil {
		return notFound(err)
	}
	if err := s.spawnSubscription(ctx, qtx, userID, t, frequency); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// syncPaidAt mantem paid_at coerente com status num update parcial.
//
// A coluna tem CHECK exigindo paid_at preenchido quando status = 'paid' e nulo
// caso contrario. Sem isto, marcar uma transacao paga como pendente deixaria a
// data de pagamento antiga para tras — que era o comportamento do legado, e
// fazia o relatorio de pagos contar a transacao de novo.
//
// So age quando o corpo traz status; nao inventa mudanca que o cliente nao pediu.
func syncPaidAt(body map[string]any) {
	status, ok := body["status"].(string)
	if !ok {
		return
	}
	if status == "paid" {
		body["paidAt"] = time.Now().UTC().Format(time.RFC3339)
		return
	}
	body["paidAt"] = nil
}

// billingDay extrai o dia do mes, que vira o dia de cobranca da assinatura.
func billingDay(date dates.Date) *int32 {
	v := int32(date.Day())
	return &v
}

func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return apperrors.ErrNotFound
	}
	return err
}

func deref(p *string, def string) string {
	if p == nil || *p == "" {
		return def
	}
	return *p
}

func derefBool(p *bool, def bool) bool {
	if p == nil {
		return def
	}
	return *p
}

// emptyToNil trata "" como ausencia, como o `body.categoryId || null` do
// legado: o cliente manda string vazia quando o select esta em branco, e
// gravar "" quebraria a FK.
func emptyToNil(p *string) *string {
	if p == nil || *p == "" {
		return nil
	}
	return p
}
