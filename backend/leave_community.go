package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) LeaveCommunity(
	ctx context.Context,
	req *connect.Request[zenaov1.LeaveCommunityRequest],
) (*connect.Response[zenaov1.LeaveCommunityResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("leave-community", zap.String("community-id", req.Msg.CommunityId), zap.String("user-id", zUser.ID))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	// var cmt *zeni.Community
	// if err := s.DB.TxWithSpan(ctx, "db.LeaveCommunity", func(tx zeni.DB) error {
	// 	cmt, err = tx.GetCommunity(req.Msg.CommunityId)
	// 	if err != nil {
	// 		return err
	// 	}
	// 	if cmt == nil {
	// 		return errors.New("community not found")
	// 	}

	// 	administrators, err := tx.GetOrgEntitiesWithRole(zeni.EntityTypeCommunity, cmt.ID, zeni.EntityTypeUser, zeni.RoleAdministrator)
	// 	if err != nil {
	// 		return err
	// 	}

	// 	if len(administrators) == 1 && administrators[0].EntityID == zUser.ID {
	// 		return errors.New("user is the only administrator of this community and cannot leave it")
	// 	}

	// 	if err := tx.RemoveMemberFromCommunity(cmt.ID, zUser.ID); err != nil {
	// 		return err
	// 	}

	// 	s.Logger.Info("user left community", zap.String("community-id", cmt.ID), zap.String("user-id", zUser.ID))
	// 	return nil
	// }); err != nil {
	// 	return nil, err
	// }

	// TODO:
	// 1. Retrieve community & creator from on-chain

	if err := s.Chain.WithContext(ctx).RemoveMemberFromCommunity(cmt.CreatorID, cmt.ID, zUser.ID); err != nil {
		return nil, errors.New("failed to remove member from community on chain")
	}

	return connect.NewResponse(&zenaov1.LeaveCommunityResponse{}), nil
}
