// Package service concentra a regra de negocio do modulo auth.
package service

import (
	"context"
	"errors"

	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/modules/auth/repository"
	"financaspro/server/modules/auth/types"
	"financaspro/server/shared/crypto"
	apperrors "financaspro/server/shared/errors"
	"financaspro/server/shared/security"
)

type Service struct {
	repo   *repository.Repository
	signer *security.Signer
}

func New(repo *repository.Repository, signer *security.Signer) *Service {
	return &Service{repo: repo, signer: signer}
}

func (s *Service) Register(ctx context.Context, req types.RegisterRequest) (*types.AuthResponse, error) {
	if _, err := s.repo.FindByEmail(ctx, req.Email); err == nil {
		return nil, httperrors.Conflict("Email já cadastrado")
	} else if !errors.Is(err, apperrors.ErrNotFound) {
		return nil, err
	}

	hash, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user, err := s.repo.CreateWithProfile(ctx, req.Email, hash, req.DisplayName)
	if err != nil {
		return nil, err
	}
	return s.issue(user.ID, user.Email, user.DisplayName)
}

func (s *Service) Login(ctx context.Context, req types.LoginRequest) (*types.AuthResponse, error) {
	user, err := s.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, apperrors.ErrNotFound) {
			// Mesma mensagem de senha errada, de proposito: distinguir os dois
			// casos entregaria a lista de emails cadastrados a quem perguntar.
			return nil, httperrors.Unauthorized("Credenciais inválidas")
		}
		return nil, err
	}
	if !crypto.ComparePassword(req.Password, user.PasswordHash) {
		return nil, httperrors.Unauthorized("Credenciais inválidas")
	}
	return s.issue(user.ID, user.Email, user.DisplayName)
}

func (s *Service) Me(ctx context.Context, userID string) (*types.MeResponse, error) {
	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	createdAt := user.CreatedAt
	return &types.MeResponse{User: types.User{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		CreatedAt:   &createdAt,
	}}, nil
}

func (s *Service) issue(id, email string, displayName *string) (*types.AuthResponse, error) {
	token, err := s.signer.Sign(id, email)
	if err != nil {
		return nil, err
	}
	return &types.AuthResponse{
		Token: token,
		User:  types.User{ID: id, Email: email, DisplayName: displayName},
	}, nil
}
