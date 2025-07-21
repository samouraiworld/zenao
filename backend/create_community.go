package main

import (
	"context"
	"errors"
	_ "time/tzdata"

	"connectrpc.com/connect"
	communitiesv1 "github.com/samouraiworld/zenao/backend/communities/v1"
)

func (s *ZenaoServer) CreateCommunity(
	ctx context.Context,
	req *connect.Request[communitiesv1.CreateCommunityRequest],
) (*connect.Response[communitiesv1.CreateCommunityResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}
	return nil, errors.New("not implemented yet")
}
