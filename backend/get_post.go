package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) GetPost(ctx context.Context, req *connect.Request[zenaov1.GetPostRequest]) (*connect.Response[feedsv1.PostView], error) {
	return nil, errors.New("not implemented")
}
