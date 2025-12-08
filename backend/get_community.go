package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) GetCommunity(ctx context.Context, req *connect.Request[zenaov1.GetCommunityRequest]) (*connect.Response[zenaov1.CommunityInfo], error) {
	return nil, errors.New("not implemented")
}
