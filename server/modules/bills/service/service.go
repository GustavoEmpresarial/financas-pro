// Package service concentra a regra de negocio das contas a pagar.
package service

import (
	"context"
	"errors"
	"math"
	"regexp"
	"strconv"

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

const Table = "bills"

var Columns = sqlbuilder.NewColumns(
	"title", "amount", "due_date", "paid_date", "paid_amount", "is_paid",
	"status", "priority", "category_id", "account_id", "payment_method_id",
	"notes", "is_recurring", "recurrence_interval", "installment_count",
	"installment_number", "installment_group",
)

type Service struct {
	pool *pgxpool.Pool
	q    *gen.Queries
}

func New(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool, q: gen.New(pool)}
}

func (s *Service) List(ctx context.Context, userID string, month *string) ([]gen.Bill, error) {
	return s.q.ListBills(ctx, gen.ListBillsParams{UserID: userID, Month: month})
}

func (s *Service) Create(ctx context.Context, userID string, body crud.Body) (gen.Bill, error) {
	var out gen.Bill
	patch := sqlbuilder.NewPatch(body, Columns, utils.CamelToSnake).
		Set("id", uuid.NewString()).
		Set("user_id", userID)
	query, args, err := patch.Insert(Table)
	if err != nil {
		return out, err
	}
	var id string
	if err := s.pool.QueryRow(ctx, query, args...).Scan(&id); err != nil {
		return out, err
	}
	return s.q.GetBill(ctx, gen.GetBillParams{ID: id, UserID: userID})
}

func (s *Service) Update(ctx context.Context, userID, id string, body crud.Body) error {
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
	rows, err := s.q.SoftDeleteBill(ctx, gen.SoftDeleteBillParams{ID: id, UserID: userID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperrors.ErrNotFound
	}
	return nil
}

// TogglePaid alterna entre pago e pendente.
//
// Pagar preenche paid_date com hoje e paid_amount com o valor cheio; despagar
// limpa os dois. E o comportamento do legado — pagamento parcial nao passa por
// aqui, e sim pelo PUT comum.
func (s *Service) TogglePaid(ctx context.Context, userID, id string) error {
	bill, err := s.q.GetBill(ctx, gen.GetBillParams{ID: id, UserID: userID})
	if err != nil {
		return notFound(err)
	}

	paying := !bill.IsPaid
	params := gen.SetBillPaidParams{
		ID:         id,
		UserID:     userID,
		IsPaid:     paying,
		PaidAmount: 0,
		Status:     "pending",
	}
	if paying {
		today := dates.TodayDate()
		params.PaidDate = &today
		params.PaidAmount = bill.Amount
		params.Status = "paid"
	}

	rows, err := s.q.SetBillPaid(ctx, params)
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperrors.ErrNotFound
	}
	return nil
}

// Postpone empurra o vencimento em N meses.
func (s *Service) Postpone(ctx context.Context, userID, id string, months int) error {
	bill, err := s.q.GetBill(ctx, gen.GetBillParams{ID: id, UserID: userID})
	if err != nil {
		return notFound(err)
	}

	// AddMonths em vez de somar mes direto: vencimento dia 31 adiado um mes cai
	// no ultimo dia de fevereiro, e nao em 2 ou 3 de marco.
	newDue := bill.DueDate.AddMonths(months)

	rows, err := s.q.PostponeBill(ctx, gen.PostponeBillParams{ID: id, UserID: userID, DueDate: newDue})
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperrors.ErrNotFound
	}
	return nil
}

// installmentSuffix casa " (2/12)" no fim do titulo, para nao acumular sufixo
// ao parcelar uma conta que ja era parcela.
var installmentSuffix = regexp.MustCompile(`\s\(\d+/\d+\)$`)

// Split troca uma conta por N parcelas mensais e apaga a original.
func (s *Service) Split(ctx context.Context, userID, id string, parcels int) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	bill, err := qtx.GetBill(ctx, gen.GetBillParams{ID: id, UserID: userID})
	if err != nil {
		return notFound(err)
	}

	// Arredonda para centavos, como o legado. A ultima parcela absorve a
	// diferenca para a soma fechar com o valor original — o legado nao fazia
	// isso e perdia ate alguns centavos no total.
	each := math.Round(bill.Amount/float64(parcels)*100) / 100
	last := math.Round((bill.Amount-each*float64(parcels-1))*100) / 100

	base := installmentSuffix.ReplaceAllString(bill.Title, "")
	group := id

	for i := 0; i < parcels; i++ {
		amount := each
		if i == parcels-1 {
			amount = last
		}
		dueDate := bill.DueDate.AddMonths(i)

		number := int32(i + 1)
		count := int32(parcels)
		if err := qtx.CreateBillInstallment(ctx, gen.CreateBillInstallmentParams{
			ID:                uuid.NewString(),
			UserID:            userID,
			Title:             base + " (" + strconv.Itoa(i+1) + "/" + strconv.Itoa(parcels) + ")",
			Amount:            amount,
			DueDate:           dueDate,
			CategoryID:        bill.CategoryID,
			AccountID:         bill.AccountID,
			Priority:          bill.Priority,
			Notes:             bill.Notes,
			InstallmentCount:  &count,
			InstallmentNumber: &number,
			InstallmentGroup:  &group,
		}); err != nil {
			return err
		}
	}

	if _, err := qtx.SoftDeleteBill(ctx, gen.SoftDeleteBillParams{ID: id, UserID: userID}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return apperrors.ErrNotFound
	}
	return err
}
