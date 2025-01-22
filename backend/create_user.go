package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreateUser(
	ctx context.Context,
	req *connect.Request[zenaov1.CreateUserRequest],
) (*connect.Response[zenaov1.CreateUserResponse], error) {
	user := s.GetUser(ctx)

	s.Logger.Info("create-user", zap.String("username", req.Msg.DisplayName), zap.String("user-id", user.ID))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := s.DBTx(func(db ZenaoDB) error {
		if _, err := db.CreateUser(user.ID, req.Msg); err != nil {
			return err
		}

		if err := s.Chain.CreateUser(user.ID, req.Msg); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreateUserResponse{
		Id: user.ID,
	}), nil
}
