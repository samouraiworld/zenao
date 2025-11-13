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

	cmtRealmID := s.Chain.CommunityRealmID(req.Msg.CommunityId)
	userRealmID := s.Chain.UserRealmID(zUser.ID)
	cmt, err := s.Chain.WithContext(ctx).GetCommunity(cmtRealmID)
	if err != nil {
		return nil, err
	}

	if err := s.Chain.WithContext(ctx).RemoveMemberFromCommunity(cmt.Administrators[0], cmtRealmID, userRealmID); err != nil {
		return nil, errors.New("failed to remove member from community on chain")
	}

	return connect.NewResponse(&zenaov1.LeaveCommunityResponse{}), nil
}
