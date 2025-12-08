package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) ListCommunities(ctx context.Context, req *connect.Request[zenaov1.ListCommunitiesRequest]) (*connect.Response[zenaov1.CommunitiesInfo], error) {

	return nil, errors.New("not implemented")
}
