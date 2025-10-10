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

	evtRealmID := s.Chain.EventRealmID(req.Msg.EventId)
	userRealmID := s.Chain.UserRealmID(zUser.ID)
	evt, err := s.Chain.WithContext(ctx).GetEvent(evtRealmID)
	if err != nil {
		return nil, err
	}
	ticketPK, err := s.Chain.WithContext(ctx).GetEventUserTicketPK(evtRealmID, userRealmID)
	if err != nil {
		return nil, err
	}

	// TODO: handle creatorID since it not an id anymore, either retrieve ID from address or change the chain method
	if err := s.Chain.WithContext(ctx).CancelParticipation(evtRealmID, evt.Organizers[0], userRealmID, ticketPK); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CancelParticipationResponse{}), nil
}
