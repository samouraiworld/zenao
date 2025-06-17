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

	if err := s.DB.Tx(func(db zeni.DB) error {
		post, err := db.GetPostByID(req.Msg.PostId)
		if err != nil {
			return err
		}
		feed, err := db.GetFeedByID(post.FeedID)
		if err != nil {
			return err
		}
		roles, err := db.UserRoles(zUser.ID, feed.ID)
		if err != nil {
			return err
		}
		if len(roles) == 0 {
			return errors.New("user is not a member of the event")
		}
		if post.UserID != zUser.ID {
			return errors.New("user is not the author of the post")
		}
		return db.DeletePost(req.Msg.PostId)
	}); err != nil {
	return connect.NewResponse(&zenaov1.DeletePostResponse{}), nil
}
