package main

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
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

	evt := (*zeni.Event)(nil)
	ticket := (*zeni.SoldTicket)(nil)
	if err := s.DB.WithContext(ctx).Tx(func(db zeni.DB) error {
		evt, err = db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}
		if time.Now().After(evt.StartDate) {
			return errors.New("event already started")
		}
		ticket, err = db.GetEventUserTicket(req.Msg.EventId, zUser.ID)
		if err != nil {
			return err
		}
		if ticket.Checkin != nil {
			return errors.New("user already checked-in")
		}
		err = db.CancelParticipation(evt.ID, zUser.ID)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	if err := s.Chain.WithContext(ctx).CancelParticipation(req.Msg.EventId, evt.CreatorID, zUser.ID, ticket.Ticket.Pubkey()); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CancelParticipationResponse{}), nil
}
