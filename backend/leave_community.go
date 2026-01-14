package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) LeaveCommunity(
	ctx context.Context,
	req *connect.Request[zenaov1.LeaveCommunityRequest],
) (*connect.Response[zenaov1.LeaveCommunityResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("leave-community", zap.String("community-id", req.Msg.CommunityId), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	var cmt *zeni.Community
	if err := s.DB.TxWithSpan(ctx, "db.LeaveCommunity", func(tx zeni.DB) error {
		cmt, err = tx.GetCommunity(req.Msg.CommunityId)
		if err != nil {
			return err
		}
		if cmt == nil {
			return errors.New("community not found")
		}

		administrators, err := tx.GetOrgEntitiesWithRole(zeni.EntityTypeCommunity, cmt.ID, zeni.EntityTypeUser, zeni.RoleAdministrator)
		if err != nil {
			return err
		}

		if len(administrators) == 1 && administrators[0].EntityID == actor.ID() {
			return errors.New("user is the only administrator of this community and cannot leave it")
		}

		if err := tx.RemoveMemberFromCommunity(cmt.ID, actor.ID()); err != nil {
			return err
		}

		s.Logger.Info("user left community", zap.String("community-id", cmt.ID), zap.String("actor-id", actor.ID()))
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.LeaveCommunityResponse{}), nil
}
