package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CancelParticipation(ctx context.Context, req *connect.Request[zenaov1.CancelParticipationRequest]) (*connect.Response[zenaov1.CancelParticipationResponse], error) {
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

	s.Logger.Info("cancel-participation", zap.String("event-id", req.Msg.EventId), zap.String("user-id", zUser.ID))

	evt, err := s.Chain.WithContext(ctx).GetEvent(req.Msg.EventId)
	if err != nil {
		return nil, err
	}
	ticket, err := s.Chain.WithContext(ctx).GetEventUserTicket(req.Msg.EventId, zUser.ID)
	if err != nil {
		return nil, err
	}

	if err := s.Chain.WithContext(ctx).CancelParticipation(req.Msg.EventId, evt.CreatorID, zUser.ID, ticket.Ticket.Pubkey()); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CancelParticipationResponse{}), nil
}
