package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) DeletePost(ctx context.Context, req *connect.Request[zenaov1.DeletePostRequest]) (*connect.Response[zenaov1.DeletePostResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("delete-post", zap.String("post-id", req.Msg.PostId), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	if err := s.DB.TxWithSpan(ctx, "db.DeletePost", func(db zeni.DB) error {
		post, err := db.GetPostByID(req.Msg.PostId)
		if err != nil {
			return err
		}
		if post.UserID != actor.ID() {
			return errors.New("user is not the author of the post")
		}
		feed, err := db.GetFeedByID(post.FeedID)
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
		return db.DeletePost(req.Msg.PostId)
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.DeletePostResponse{}), nil
}
