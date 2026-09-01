// Package controller expoe /api/subscriptions.
package controller

import (
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"financaspro/server/core/database/gen"
	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/core/http/middleware"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/subscriptions/service"
	"financaspro/server/modules/subscriptions/types"
	"financaspro/server/modules/subscriptions/validation"
	"financaspro/server/shared/crud"
	"financaspro/server/shared/dates"
	sharedhttp "financaspro/server/shared/http"
)

type Controller struct {
	svc *service.Service
	log *slog.Logger
}

func New(svc *service.Service, log *slog.Logger) *Controller {
	return &Controller{svc: svc, log: log}
}

func (c *Controller) id(r *http.Request) (string, error) {
	return sharedhttp.PathID(r, "id")
}

func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	items, err := c.svc.List(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, items)
}

func (c *Controller) Create(w http.ResponseWriter, r *http.Request) {
	var req types.CreateRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.Create(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}

	userID := middleware.UserID(r.Context())
	frequency := "monthly"
	if req.Frequency != nil && *req.Frequency != "" {
		frequency = *req.Frequency
	}

	// A data ja foi validada; aqui so muda de formato.
	var nextBilling *dates.Date
	if req.NextBillingDate != nil && *req.NextBillingDate != "" {
		parsed, err := dates.ParseDate(*req.NextBillingDate)
		if err != nil {
			responses.Error(w, r, c.log, httperrors.BadRequest("Próxima cobrança precisa estar no formato AAAA-MM-DD"))
			return
		}
		nextBilling = &parsed
	}

	params := gen.CreateSubscriptionParams{
		ID:              uuid.NewString(),
		UserID:          userID,
		Name:            req.Name,
		Amount:          req.Amount,
		Frequency:       frequency,
		CategoryID:      emptyToNil(req.CategoryID),
		AccountID:       emptyToNil(req.AccountID),
		PaymentMethodID: emptyToNil(req.PaymentMethodID),
		NextBillingDate: nextBilling,
		BillingDay:      billingDay(req),
		Status:          "active",
		IsActive:        true,
		Notes:           req.Notes,
		Color:           req.Color,
		Icon:            req.Icon,
		LogoUrl:         emptyToNil(req.LogoURL),
	}

	sub, err := c.svc.Create(r.Context(), userID, req.Name, req.Amount, frequency, params)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, sub)
}

func (c *Controller) Update(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	var body crud.Body
	if err := sharedhttp.Decode(r, &body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.Update(&body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.Update(r.Context(), middleware.UserID(r.Context()), id, body); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

func (c *Controller) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.Delete(r.Context(), middleware.UserID(r.Context()), id); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

func (c *Controller) Charge(w http.ResponseWriter, r *http.Request) {
	id, err := c.id(r)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	// O corpo e opcional aqui: a tela chama sem body na maioria das vezes.
	var req types.ChargeRequest
	if r.ContentLength > 0 {
		if err := sharedhttp.Decode(r, &req); err != nil {
			responses.Error(w, r, c.log, err)
			return
		}
	}
	if err := validation.Charge(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.svc.Charge(r.Context(), middleware.UserID(r.Context()), id, req.Date); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

// billingDay usa o valor enviado ou, na falta dele, deduz do dia da proxima
// cobranca — como o legado fazia ao criar assinatura a partir de transacao.
func billingDay(req types.CreateRequest) *int32 {
	if req.BillingDay != nil {
		return req.BillingDay
	}
	if req.NextBillingDate == nil {
		return nil
	}
	parts := strings.Split(*req.NextBillingDate, "-")
	if len(parts) != 3 {
		return nil
	}
	d, err := strconv.Atoi(parts[2])
	if err != nil {
		return nil
	}
	v := int32(d)
	return &v
}

func emptyToNil(p *string) *string {
	if p == nil || *p == "" {
		return nil
	}
	return p
}
