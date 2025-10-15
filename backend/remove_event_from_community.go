package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) RemoveEventFromCommunity(
	ctx context.Context,
	req *connect.Request[zenaov1.RemoveEventFromCommunityRequest],
) (*connect.Response[zenaov1.RemoveEventFromCommunityResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	return nil, errors.New("feature locked for now and not used in the UI")

	// zUser, err := s.EnsureUserExists(ctx, user)
	// if err != nil {
	// 	return nil, err
	// }

	// s.Logger.Info("remove-event-from-community", zap.String("event-id", req.Msg.EventId), zap.String("community-id", req.Msg.CommunityId), zap.String("user-id", zUser.ID))

	// if user.Banned {
	// 	return nil, errors.New("user is banned")
	// }

	// if err := s.Chain.WithContext(ctx).RemoveEventFromCommunity(zUser.ID, req.Msg.CommunityId, req.Msg.EventId); err != nil {
	// 	return nil, err
	// }

	//return connect.NewResponse(&zenaov1.RemoveEventFromCommunityResponse{}), nil
}
