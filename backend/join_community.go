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

func (s *ZenaoServer) JoinCommunity(
	ctx context.Context,
	req *connect.Request[zenaov1.JoinCommunityRequest],
) (*connect.Response[zenaov1.JoinCommunityResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("join-community", zap.String("community-id", req.Msg.CommunityId), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	var cmt *zeni.Community
	if err := s.DB.TxWithSpan(ctx, "db.JoinCommunity", func(tx zeni.DB) error {
		cmt, err = tx.GetCommunity(req.Msg.CommunityId)
		if err != nil {
			return err
		}
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeCommunity, cmt.ID)
		if err != nil {
			return err
		}
		if slices.Contains(roles, zeni.RoleMember) {
			return errors.New("user is already a member of this community")
		}
		if err := tx.AddMemberToCommunity(cmt.ID, actor.ID()); err != nil {
			return err
		}
		s.Logger.Info("user joined community", zap.String("community-id", cmt.ID), zap.String("actor-id", actor.ID()))
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.JoinCommunityResponse{}), nil
}
