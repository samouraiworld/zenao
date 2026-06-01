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

func (s *ZenaoServer) RemoveCommunityMember(
	ctx context.Context,
	req *connect.Request[zenaov1.RemoveCommunityMemberRequest],
) (*connect.Response[zenaov1.RemoveCommunityMemberResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("remove-community-member",
		zap.String("community-id", req.Msg.CommunityId),
		zap.String("user-id", req.Msg.UserId),
		zap.String("actor-id", actor.ID()),
	)

	if err := s.DB.TxWithSpan(ctx, "db.RemoveCommunityMember", func(db zeni.DB) error {
		actorRoles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeCommunity, req.Msg.CommunityId)
		if err != nil {
			return err
		}
		if !slices.Contains(actorRoles, zeni.RoleAdministrator) {
			return errors.New("only community administrators can remove members")
		}

		targetRoles, err := db.EntityRoles(zeni.EntityTypeUser, req.Msg.UserId, zeni.EntityTypeCommunity, req.Msg.CommunityId)
		if err != nil {
			return err
		}
		if slices.Contains(targetRoles, zeni.RoleAdministrator) {
			return errors.New("cannot remove a community administrator via this endpoint")
		}

		return db.RemoveMemberFromCommunity(req.Msg.CommunityId, req.Msg.UserId)
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.RemoveCommunityMemberResponse{}), nil
}
