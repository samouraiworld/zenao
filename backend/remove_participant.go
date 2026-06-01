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

		// Check if actor is organizer of the event
		roles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}

		isOrganizer := slices.Contains(roles, zeni.RoleOrganizer)

		if !isOrganizer {
			// Check if actor is admin of a community linked to the event
			communities, err := db.CommunitiesByEvent(req.Msg.EventId)
			if err != nil {
				return err
			}
			isCommunityAdmin := false
			for _, community := range communities {
				communityRoles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeCommunity, community.ID)
				if err != nil {
					return err
				}
				if slices.Contains(communityRoles, zeni.RoleAdministrator) {
					isCommunityAdmin = true
					break
				}
			}
			if !isCommunityAdmin {
				return errors.New("only the event organizer or a community administrator can remove participants")
			}
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
