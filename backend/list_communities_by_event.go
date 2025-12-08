package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) ListCommunitiesByEvent(ctx context.Context, req *connect.Request[zenaov1.ListCommunitiesByEventRequest]) (*connect.Response[zenaov1.CommunitiesInfo], error) {
	return nil, errors.New("not implemented")
}
