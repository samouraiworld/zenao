package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) GetUserAddress(
	ctx context.Context,
	req *connect.Request[zenaov1.GetUserAddressRequest],
) (*connect.Response[zenaov1.GetUserAddressResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-user-address", zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	userAddr := s.Chain.UserAddress(zUser.ID)

	return connect.NewResponse(&zenaov1.GetUserAddressResponse{
		Address: userAddr,
	}), nil
}
