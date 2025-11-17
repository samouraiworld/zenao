package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
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

	s.Logger.Info("delete-post", zap.String("post-id", req.Msg.PostId), zap.String("user-id", zUser.ID))

	userRealmID := s.Chain.UserRealmID(zUser.ID)
	if err := s.Chain.WithContext(ctx).DeletePost(userRealmID, req.Msg.PostId); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.DeletePostResponse{}), nil
}
