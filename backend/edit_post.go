package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) EditPost(ctx context.Context, req *connect.Request[zenaov1.EditPostRequest]) (*connect.Response[zenaov1.EditPostResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("edit-post", zap.String("post-id", req.Msg.PostId), zap.String("content", req.Msg.Content), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	if len(req.Msg.Content) == 0 {
		return nil, errors.New("content of standard post cannot be empty")
	}

	for _, tag := range req.Msg.Tags {
		if len(tag) == 0 {
			return nil, errors.New("a tag value cannot be empty")
		}
	}

	var zpost *zeni.Post
	if err := s.DB.TxWithSpan(ctx, "db.EditPost", func(db zeni.DB) error {
		zpost, err = db.GetPostByID(req.Msg.PostId)
		if err != nil {
			return err
		}
		if zpost.UserID != actor.ID() {
			return errors.New("user is not the author of the post")
		}
		feed, err := db.GetFeedByID(zpost.FeedID)
		if err != nil {
			return err
		}
		roles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), feed.OrgType, feed.OrgID)
		if err != nil {
			return err
		}
		if len(roles) == 0 {
			return errors.New("user is not a member of the event")
		}
		return db.EditPost(req.Msg.PostId, req.Msg)
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EditPostResponse{PostId: zpost.ID}), nil
}
