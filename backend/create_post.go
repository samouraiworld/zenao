package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreatePost(ctx context.Context, req *connect.Request[zenaov1.CreatePostRequest]) (*connect.Response[zenaov1.CreatePostResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("create-standard-post", zap.String("event-id", req.Msg.EventId), zap.String("content", req.Msg.Content), zap.String("user-id", string(userID)), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	//XXX: do more verification ?
	if len(req.Msg.Content) == 0 {
		return nil, errors.New("content of standard post cannot be empty")
	}

	for _, tag := range req.Msg.Tags {
		if len(tag) == 0 {
			return nil, errors.New("a tag value cannot be empty")
		}
	}

	zpost := (*zeni.Post)(nil)
	if err := s.DB.Tx(func(db zeni.DB) error {
		roles, err := db.UserRoles(userID, req.Msg.EventId)
		if err != nil {
			return err
		}
		if len(roles) == 0 {
			return errors.New("user is not a member of the event")
		}

		post := &feedsv1.Post{
			Loc:  nil,
			Tags: req.Msg.Tags,
			Post: &feedsv1.Post_Standard{
				Standard: &feedsv1.StandardPost{
					Content: req.Msg.Content,
				},
			},
		}

		postID, err := s.Chain.CreatePost(userID, req.Msg.EventId, post)
		if err != nil {
			return err
		}

		feed, err := db.GetFeed(req.Msg.EventId, "main")
		if err != nil {
			return err
		}

		if zpost, err = db.CreatePost(postID, feed.ID, userID, post); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreatePostResponse{PostId: zpost.ID}), nil
}
