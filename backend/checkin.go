package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

// Participate implements zenaov1connect.ZenaoServiceHandler.
func (s *ZenaoServer) Checkin(ctx context.Context, req *connect.Request[zenaov1.CheckinRequest]) (*connect.Response[zenaov1.CheckinResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("checkin", zap.String("gatekeeper", zUser.ID), zap.String("pubkey", req.Msg.TicketPubkey))

	// TODO: I added event_id in the request to avoid to search on-chain the event based on the ticket pubkey
	evt, err := s.Chain.WithContext(ctx).GetEvent(req.Msg.EventId)
	if err != nil {
		return nil, err
	}

	if evt != nil {
		if err := s.Chain.WithContext(ctx).Checkin(req.Msg.EventId, zUser.ID, req.Msg); err != nil {
			s.Logger.Error("failed to checkin on-chain, ignoring to prevent entrance brick")
		}
	}

	return connect.NewResponse(&zenaov1.CheckinResponse{}), nil
}
