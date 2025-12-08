package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) GetPoll(ctx context.Context, req *connect.Request[zenaov1.GetPollRequest]) (*connect.Response[pollsv1.Poll], error) {
	return nil, errors.New("not implemented")
}
