package main

import (
	"context"
	"errors"

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

	evtRealmID := s.Chain.EventRealmID(req.Msg.EventId)
	userRealmID := s.Chain.UserRealmID(zUser.ID)

	var ticket *zeni.SoldTicket
	if err := s.DB.TxWithSpan(ctx, "db.CancelParticipation", func(tx zeni.DB) error {
		ticket, err = tx.GetEventUserTicket(evtRealmID, userRealmID)
		if err != nil {
			return err
		}
		return tx.CancelParticipation(evtRealmID, userRealmID)
	}); err != nil {
		return nil, err
	}

	evt, err := s.Chain.WithContext(ctx).GetEvent(evtRealmID)
	if err != nil {
		return nil, err
	}

	// TODO: how to handle if chain fail but not db already deleted the ticket ?????
	if err := s.Chain.WithContext(ctx).CancelParticipation(evtRealmID, evt.Organizers[0], userRealmID, ticket.Ticket.Pubkey()); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CancelParticipationResponse{}), nil
}
