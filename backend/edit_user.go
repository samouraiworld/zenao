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

	s.Logger.Info("edit-user", zap.String("user-id", user.ID))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := s.DBTx(func(db ZenaoDB) error {
		if err := db.EditUser(user.ID, req.Msg); err != nil {
			return err
		}

		if err := s.Chain.EditUser(user.ID, req.Msg); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EditUserResponse{
		Id: user.ID,
	}), nil
}
