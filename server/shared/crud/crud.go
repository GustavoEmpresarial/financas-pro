// Package crud implementa o controller HTTP que 12 dos 18 modulos compartilham.
//
// Por que existe: no backend legado, categories, accounts, credit_cards,
// investments, crypto, earnings, goals, payment_methods, category_budgets e
// transfers tinham arquivos de rota praticamente identicos — 30 linhas cada,
// variando so o nome da tabela. Repetir isso em Go daria ~70 arquivos iguais,
// e um bug de escopo por dono corrigido em um deles nao chegaria nos outros.
//
// O que varia por modulo (SQL, DTOs, validacao) continua no modulo. O que nao
// varia (formato da resposta, tratamento de erro, leitura do :id) esta aqui.
package crud

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"financaspro/server/core/http/responses"
	sharedhttp "financaspro/server/shared/http"
)

// Repository e o que um modulo CRUD precisa saber fazer.
//
// T = o registro devolvido; C = corpo do POST; U = corpo do PUT.
//
// Nenhum metodo recebe userID: o dono sai do context dentro da implementacao,
// para que esquecer o filtro exija um erro deliberado, e nao um descuido.
type Repository[T any, C any, U any] interface {
	List(ctx context.Context) ([]T, error)
	Create(ctx context.Context, in C) (T, error)
	Update(ctx context.Context, id string, in U) (T, error)
	SoftDelete(ctx context.Context, id string) error
}

// Validator valida e normaliza um DTO no lugar. Passe nil para nao validar.
type Validator[V any] func(*V) error

type Controller[T any, C any, U any] struct {
	repo           Repository[T, C, U]
	log            *slog.Logger
	validateCreate Validator[C]
	validateUpdate Validator[U]
}

func New[T any, C any, U any](
	repo Repository[T, C, U],
	log *slog.Logger,
	validateCreate Validator[C],
	validateUpdate Validator[U],
) *Controller[T, C, U] {
	return &Controller[T, C, U]{repo: repo, log: log, validateCreate: validateCreate, validateUpdate: validateUpdate}
}

func (c *Controller[T, C, U]) List(w http.ResponseWriter, r *http.Request) {
	items, err := c.repo.List(r.Context())
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, items)
}

func (c *Controller[T, C, U]) Create(w http.ResponseWriter, r *http.Request) {
	var in C
	if err := sharedhttp.Decode(r, &in); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if c.validateCreate != nil {
		if err := c.validateCreate(&in); err != nil {
			responses.Error(w, r, c.log, err)
			return
		}
	}
	item, err := c.repo.Create(r.Context(), in)
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, item)
}

func (c *Controller[T, C, U]) Update(w http.ResponseWriter, r *http.Request) {
	id, err := sharedhttp.PathID(r, "id")
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	var in U
	if err := sharedhttp.Decode(r, &in); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if c.validateUpdate != nil {
		if err := c.validateUpdate(&in); err != nil {
			responses.Error(w, r, c.log, err)
			return
		}
	}
	if _, err := c.repo.Update(r.Context(), id, in); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	// {"ok": true}, nao o registro atualizado: e o que o legado devolvia, e os
	// hooks do cliente invalidam a query em vez de ler a resposta.
	responses.OK(w)
}

func (c *Controller[T, C, U]) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := sharedhttp.PathID(r, "id")
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := c.repo.SoftDelete(r.Context(), id); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}

// Mount pendura GET/POST/PUT/DELETE em `path`, a forma dos 12 modulos CRUD.
//
// Nao aplica o middleware de auth: quem monta ja esta dentro de um grupo
// autenticado. Ver server/bootstrap/routes.go.
func Mount[T any, C any, U any](r chi.Router, path string, c *Controller[T, C, U]) {
	r.Route(path, func(sub chi.Router) {
		sub.Get("/", c.List)
		sub.Post("/", c.Create)
		sub.Put("/{id}", c.Update)
		sub.Delete("/{id}", c.Delete)
	})
}
