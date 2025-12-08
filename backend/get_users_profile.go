package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) GetUsersProfile(ctx context.Context, req *connect.Request[zenaov1.GetUsersProfileRequest]) (*connect.Response[zenaov1.GetUsersProfileResponse], error) {
	return nil, errors.New("not implemented")
}
