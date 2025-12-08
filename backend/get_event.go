package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) GetEvent(ctx context.Context, req *connect.Request[zenaov1.GetEventRequest]) (*connect.Response[zenaov1.EventInfo], error) {
	return nil, errors.New("not implemented")
}
