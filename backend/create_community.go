package main

import (
	"context"
	"errors"
	_ "time/tzdata"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) CreateCommunity(
	ctx context.Context,
	req *connect.Request[zenaov1.CreateCommunityRequest],
) (*connect.Response[zenaov1.CreateCommunityResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}
	return nil, errors.New("not implemented yet")
}
