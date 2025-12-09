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
func (s *ZenaoServer) RemoveEventFromCommunity(
	ctx context.Context,
	req *connect.Request[zenaov1.RemoveEventFromCommunityRequest],
) (*connect.Response[zenaov1.RemoveEventFromCommunityResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("remove-event-from-community", zap.String("event-id", req.Msg.EventId), zap.String("community-id", req.Msg.CommunityId), zap.String("user-id", zUser.ID))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := s.DB.TxWithSpan(ctx, "db.RemoveEventFromCommunity", func(tx zeni.DB) error {
		cmt, err := tx.GetCommunity(req.Msg.CommunityId)
		if err != nil {
			return err
		}
		cmtRoles, err := tx.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeCommunity, cmt.ID)
		if err != nil {
			return err
		}
		evtRoles, err := tx.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(cmtRoles, zeni.RoleAdministrator) && !slices.Contains(evtRoles, zeni.RoleOrganizer) {
			return errors.New("user is not an administrator of this community and is not an organizer of the event")
		}
		if err := tx.RemoveEventFromCommunity(req.Msg.EventId, cmt.ID); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	// if err := s.Chain.WithContext(ctx).RemoveEventFromCommunity(zUser.ID, req.Msg.CommunityId, req.Msg.EventId); err != nil {
	// 	return nil, err
	// }

	return connect.NewResponse(&zenaov1.RemoveEventFromCommunityResponse{}), nil
}
