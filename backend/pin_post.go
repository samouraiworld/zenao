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
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("pin-post", zap.String("post-id", req.Msg.PostId), zap.Bool("pinned", req.Msg.Pinned), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := s.DB.TxWithSpan(ctx, "PinPost", func(tx zeni.DB) error {
		post, err := tx.GetPostByID(req.Msg.PostId)
		if err != nil {
			return err
		}
		feed, err := tx.GetFeedByID(post.FeedID)
		if err != nil {
			return err
		}
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, zUser.ID, feed.OrgType, feed.OrgID)
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
