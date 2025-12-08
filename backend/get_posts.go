package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) GetPosts(ctx context.Context, req *connect.Request[zenaov1.GetPostsRequest]) (*connect.Response[zenaov1.GetPostsResponse], error) {
	return nil, errors.New("not implemented")
}
