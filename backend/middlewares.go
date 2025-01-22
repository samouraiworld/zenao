package main

import (
	"context"
	"errors"

	"go.uber.org/zap"
)

func (s *ZenaoServer) EnsureUserExists(
	ctx context.Context,
	user ZenaoUser,
) (string, error) {
	s.Logger.Info("create-user", zap.String("user-id", user.ID))

	if user.Banned {
		return "", errors.New("user is banned")
	}

	userID := ""
	if err := s.DBTx(func(db ZenaoDB) error {
		var err error
		if userID, err = db.UserExists(user.ID); err != nil {
			return err
		} else if userID != "" {
			return nil
		}
		if userID, err = db.CreateUser(user.ID); err != nil {
			return err
		}

		if err := s.Chain.CreateUser(userID); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return "", err
	}

	return userID, nil
}
