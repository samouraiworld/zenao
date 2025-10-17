package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

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

	cmtRealmID := s.Chain.CommunityRealmID(req.Msg.CommunityId)
	evtRealmID := s.Chain.EventRealmID(req.Msg.EventId)
	userRealmID := s.Chain.UserRealmID(zUser.ID)
	if err := s.Chain.WithContext(ctx).RemoveEventFromCommunity(userRealmID, cmtRealmID, evtRealmID); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.RemoveEventFromCommunityResponse{}), nil
}
