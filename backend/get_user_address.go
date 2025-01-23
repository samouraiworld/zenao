package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/gnolang/gno/gnovm/pkg/gnolang"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) GetUserAddress(
	ctx context.Context,
	req *connect.Request[zenaov1.GetUserAddressRequest],
) (*connect.Response[zenaov1.GetUserAddressResponse], error) {
	user := s.GetUser(ctx)

	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-user-address", zap.String("user-id", string(userID)), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	userAddr := gnolang.DerivePkgAddr(userRealmPkgPath(userID)).String()

	return connect.NewResponse(&zenaov1.GetUserAddressResponse{
		Address: userAddr,
	}), nil
}
