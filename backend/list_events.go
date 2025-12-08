package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) ListEvents(ctx context.Context, req *connect.Request[zenaov1.ListEventsRequest]) (*connect.Response[zenaov1.ListEventsResponse], error) {
	return nil, errors.New("not implemented")
}
