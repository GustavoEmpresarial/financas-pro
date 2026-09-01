// Package controller expoe /api/profile.
package controller

import (
	"log/slog"
	"net/http"

	"financaspro/server/core/database/gen"
	"financaspro/server/core/http/middleware"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/users/repository"
	"financaspro/server/modules/users/types"
	"financaspro/server/modules/users/validation"
	sharedhttp "financaspro/server/shared/http"
)

type Controller struct {
	repo *repository.Repository
	log  *slog.Logger
}

func New(repo *repository.Repository, log *slog.Logger) *Controller {
	return &Controller{repo: repo, log: log}
}

func (c *Controller) Get(w http.ResponseWriter, r *http.Request) {
	profile, err := c.repo.Get(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.Data(w, profile)
}

func (c *Controller) Update(w http.ResponseWriter, r *http.Request) {
	var req types.UpdateProfileRequest
	if err := sharedhttp.Decode(r, &req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	if err := validation.UpdateProfile(&req); err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	err := c.repo.Update(r.Context(), middleware.UserID(r.Context()), gen.UpdateProfileParams{
		DisplayName:     req.DisplayName,
		AvatarUrl:       req.AvatarURL,
		ThemePreference: req.ThemePreference,
	})
	if err != nil {
		responses.Error(w, r, c.log, err)
		return
	}
	responses.OK(w)
}
