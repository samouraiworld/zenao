package main

import (
	"context"
	"errors"
	"slices"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) PinPost(ctx context.Context, req *connect.Request[zenaov1.PinPostRequest]) (*connect.Response[zenaov1.PinPostResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("pin-post", zap.String("post-id", req.Msg.PostId), zap.Bool("pinned", req.Msg.Pinned), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	if err := s.DB.TxWithSpan(ctx, "PinPost", func(tx zeni.DB) error {
		post, err := tx.GetPostByID(req.Msg.PostId)
		if err != nil {
			return err
		}
		feed, err := tx.GetFeedByID(post.FeedID)
		if err != nil {
			return err
		}
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, actor.ID(), feed.OrgType, feed.OrgID)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleOrganizer) && !slices.Contains(roles, zeni.RoleAdministrator) {
			return errors.New("the user is not an organizer of the event or an administrator of the community")
		}
		return tx.PinPost(feed.ID, req.Msg.PostId, req.Msg.Pinned)
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.PinPostResponse{}), nil
}
