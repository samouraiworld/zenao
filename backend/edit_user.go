package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) EditUser(
	ctx context.Context,
	req *connect.Request[zenaov1.EditUserRequest],
) (*connect.Response[zenaov1.EditUserResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	// retrieve auto-incremented user ID from database, do not use auth provider's user ID directly for realms
	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("edit-user", zap.String("user-id", zUser.ID))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := s.DB.Tx(func(db zeni.DB) error {
		if err := db.EditUser(zUser.ID, req.Msg); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	if err := s.Chain.EditUser(zUser.ID, req.Msg); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EditUserResponse{
		Id: zUser.ID,
	}), nil
}
