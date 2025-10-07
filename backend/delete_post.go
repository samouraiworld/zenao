package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) DeletePost(ctx context.Context, req *connect.Request[zenaov1.DeletePostRequest]) (*connect.Response[zenaov1.DeletePostResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	if err := s.Chain.WithContext(ctx).DeletePost(zUser.ID, req.Msg.PostId); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.DeletePostResponse{}), nil
}
