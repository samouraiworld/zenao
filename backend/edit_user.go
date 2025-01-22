package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) EditUser(
	ctx context.Context,
	req *connect.Request[zenaov1.EditUserRequest],
) (*connect.Response[zenaov1.EditUserResponse], error) {
	user := s.GetUser(ctx)

	// retrieve auto-incremented user ID from database, do not use clerk's user ID directly for realms
	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("edit-user", zap.String("user-id", string(userID)))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := s.DBTx(func(db ZenaoDB) error {
		if err := db.EditUser(userID, req.Msg); err != nil {
			return err
		}

		if err := s.Chain.EditUser(userID, req.Msg); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EditUserResponse{
		Id: userID,
	}), nil
}
