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

// TODO: CLEAN COMMENT
func (s *ZenaoServer) JoinCommunity(
	ctx context.Context,
	req *connect.Request[zenaov1.JoinCommunityRequest],
) (*connect.Response[zenaov1.JoinCommunityResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("join-community", zap.String("community-id", req.Msg.CommunityId), zap.String("user-id", zUser.ID))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	var cmt *zeni.Community
	if err := s.DB.TxWithSpan(ctx, "db.JoinCommunity", func(tx zeni.DB) error {
		cmt, err = tx.GetCommunity(req.Msg.CommunityId)
		if err != nil {
			return err
		}
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeCommunity, cmt.ID)
		if err != nil {
			return err
		}
		if slices.Contains(roles, zeni.RoleMember) {
			return errors.New("user is already a member of this community")
		}
		if err := tx.AddMemberToCommunity(cmt.ID, zUser.ID); err != nil {
			return err
		}
		s.Logger.Info("user joined community", zap.String("community-id", cmt.ID), zap.String("user-id", zUser.ID))
		return nil
	}); err != nil {
		return nil, err
	}

	// if err := s.Chain.WithContext(ctx).AddMemberToCommunity(cmt.CreatorID, cmt.ID, zUser.ID); err != nil {
	// 	return nil, errors.New("failed to add member to community on chain")
	// }

	return connect.NewResponse(&zenaov1.JoinCommunityResponse{}), nil
}
