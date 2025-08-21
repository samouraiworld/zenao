package main

import (
	"context"
	"errors"

	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) EnsureUserExists(
	ctx context.Context,
	user *zeni.AuthUser,
) (*zeni.User, error) {
	if user == nil {
		return nil, errors.New("nil user")
	}

	s.Logger.Info("create-user", zap.String("user-id", user.ID))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	userID := s.Chain.GetUserID(user.Provider, user.ID)
	zUser := &zeni.User{
		ID: userID,
	}
	s.Logger.Info("ensure-user-exists", zap.String("user-id", zUser.ID))

	alreadyExists := s.Chain.UserExists(zUser.ID)
	if !alreadyExists {
		if err := s.Chain.CreateUser(zUser); err != nil {
			return nil, err
		}
	}

	return zUser, nil
}
