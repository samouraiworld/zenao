package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) GetPoll(ctx context.Context, req *connect.Request[zenaov1.GetPollRequest]) (*connect.Response[zenaov1.GetPollResponse], error) {
	return nil, errors.New("not implemented")
}
