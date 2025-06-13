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

	if err := s.DB.Tx(func(db zeni.DB) error {
		evt, err := db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}
		if time.Now().After(evt.StartDate) {
			return errors.New("event already started")
		}
		ticket, err := db.GetEventUserTicket(req.Msg.EventId, zUser.ID)
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

	// Ensure user his participant
	// Ensure event is not started yet
	// Ensure ticket is not check-in already
	// Then soft delete his role & his ticket
	// Then on-chain:
	// Ensure ticket is not used & he is member & role participant of the DAO
	// Remove his role participant in the DAO
	// Remove his ticket from the tree event.Ticket
	// Remove from index of regevent

	return connect.NewResponse(&zenaov1.CancelParticipationResponse{}), nil
}
