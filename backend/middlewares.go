package main

import (
	"context"
	"errors"
	"fmt"

	"go.uber.org/zap"
)

func (s *ZenaoServer) EnsureUserExists(
	ctx context.Context,
	user ZenaoUser,
) (uint, error) {
	s.Logger.Info("create-user", zap.String("user-id", user.ID))

	if user.Banned {
		return 0, errors.New("user is banned")
	}

	userID := uint(0)
	if err := s.DBTx(func(db ZenaoDB) error {
		var err error
		if userID, err = db.UserExists(user.ID); err != nil {
			return err
		} else if userID != 0 {
			return nil
		}
		if userID, err = db.CreateUser(user.ID); err != nil {
			return err
		}

		if err := s.Chain.CreateUser(fmt.Sprintf("%d", userID)); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return 0, err
	}

	return userID, nil
}
