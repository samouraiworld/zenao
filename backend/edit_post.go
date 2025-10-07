package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) EditPost(ctx context.Context, req *connect.Request[zenaov1.EditPostRequest]) (*connect.Response[zenaov1.EditPostResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	s.Logger.Info("edit-post", zap.String("post-id", req.Msg.PostId), zap.String("content", req.Msg.Content), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if len(req.Msg.Content) == 0 {
		return nil, errors.New("content of standard post cannot be empty")
	}

	for _, tag := range req.Msg.Tags {
		if len(tag) == 0 {
			return nil, errors.New("a tag value cannot be empty")
		}
	}

	post := &feedsv1.Post{
		Tags: req.Msg.Tags,

		Post: &feedsv1.Post_Standard{
			Standard: &feedsv1.StandardPost{
				Content: req.Msg.Content,
			},
		},
	}

	if err := s.Chain.WithContext(ctx).EditPost(zUser.ID, req.Msg.PostId, post); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EditPostResponse{}), nil
}
