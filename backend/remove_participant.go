package main

import (
	"context"
	"errors"
	"slices"
	"time"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) RemoveParticipant(ctx context.Context, req *connect.Request[zenaov1.RemoveParticipantRequest]) (*connect.Response[zenaov1.RemoveParticipantResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("remove-participant",
		zap.String("event-id", req.Msg.EventId),
		zap.String("user-id", req.Msg.UserId),
		zap.String("actor-id", actor.ID()),
	)

	if err := s.DB.TxWithSpan(ctx, "db.RemoveParticipant", func(db zeni.DB) error {
		evt, err := db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}
		if time.Now().After(evt.StartDate) {
			return errors.New("cannot remove a participant after the event has started")
		}

		roles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleOrganizer) {
			return errors.New("only the event organizer can remove participants")
		}

		ticket, err := db.GetEventUserTicket(req.Msg.EventId, req.Msg.UserId)
		if err != nil {
			return err
		}
		if ticket.AmountMinor > 0 {
			return errors.New("cannot remove a participant with a paid ticket")
		}

		return db.CancelParticipation(req.Msg.EventId, req.Msg.UserId)
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.RemoveParticipantResponse{}), nil
}
