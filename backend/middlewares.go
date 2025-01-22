package main

import (
	"context"
	"errors"

	"go.uber.org/zap"
)

func (s *ZenaoServer) EnsureUserExists(
	ctx context.Context,
	user ZenaoUser,
) error {
	s.Logger.Info("create-user", zap.String("user-id", user.ID))

	if user.Banned {
		return errors.New("user is banned")
	}

	if err := s.DBTx(func(db ZenaoDB) error {
		if exists, err := db.UserExists(user.ID); err != nil {
			return err
		} else if exists {
			return nil
		}
		if _, err := db.CreateUser(user.ID); err != nil {
			return err
		}

		if err := s.Chain.CreateUser(user.ID); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}

	return nil
}
