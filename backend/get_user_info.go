package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) GetUserInfo(
	ctx context.Context,
	req *connect.Request[zenaov1.GetUserInfoRequest],
) (*connect.Response[zenaov1.GetUserInfoResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-user-info", zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	return connect.NewResponse(&zenaov1.GetUserInfoResponse{
		UserId: zUser.ID,
		Plan:   zUser.Plan.String(),
	}), nil
}
