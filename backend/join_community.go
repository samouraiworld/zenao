package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

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

	// TODO: A user should be able to join a community by himself
	if err := s.Chain.WithContext(ctx).AddMemberToCommunity(zUser.ID, req.Msg.CommunityId, zUser.ID); err != nil {
		return nil, errors.New("failed to add member to community on chain")
	}

	return connect.NewResponse(&zenaov1.JoinCommunityResponse{}), nil
}
