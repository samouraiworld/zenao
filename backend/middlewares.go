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
) (string, error) {
	if user == nil {
		return "", errors.New("nil user")
	}

	s.Logger.Info("create-user", zap.String("user-id", user.ID))

	if user.Banned {
		return "", errors.New("user is banned")
	}

	userID := ""
	if err := s.DB.Tx(func(db zeni.DB) error {
		var err error
		if userID, err = db.UserExists(user.ID); err != nil {
			return err
		} else if userID != "" {
			return nil
		}
		if userID, err = db.CreateUser(user.ID); err != nil {
			return err
		}

		if err := s.Chain.CreateUser(&zeni.User{ID: userID}); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return "", err
	}

	return userID, nil
}
