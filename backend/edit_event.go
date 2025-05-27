package main

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) EditEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.EditEventRequest],
) (*connect.Response[zenaov1.EditEventResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	// retrieve auto-incremented user ID from database, do not use auth provider's user ID directly for realms
	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("edit-event", zap.String("event-id", req.Msg.EventId), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	var organizersIDs []string
	organizersIDs = append(organizersIDs, zUser.ID)
	for _, organizer := range req.Msg.Organizers {
		authOrg, err := s.Auth.EnsureUserExists(ctx, organizer)
		if err != nil {
			return nil, err
		}
		zOrg, err := s.EnsureUserExists(ctx, authOrg)
		if err != nil {
			return nil, err
		}
		if slices.Contains(organizersIDs, zOrg.ID) {
			return nil, fmt.Errorf("duplicate organizer: %s", zOrg.ID)
		}
		organizersIDs = append(organizersIDs, zOrg.ID)
	}

	if err := validateEvent(req.Msg.StartDate, req.Msg.EndDate, req.Msg.Title, req.Msg.Description, req.Msg.Location, req.Msg.ImageUri, req.Msg.Capacity, req.Msg.TicketPrice, req.Msg.Password); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	var evt *zeni.Event

	if err := s.DB.Tx(func(db zeni.DB) error {
		roles, err := db.UserRoles(zUser.ID, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, "organizer") {
			return errors.New("user is not organizer of the event")
		}

		if evt, err = db.EditEvent(req.Msg.EventId, organizersIDs, req.Msg); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	privacy, err := zeni.EventPrivacyFromPasswordHash(evt.PasswordHash)
	if err != nil {
		return nil, err
	}

	if err := s.Chain.EditEvent(req.Msg.EventId, zUser.ID, organizersIDs, req.Msg, privacy); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EditEventResponse{
		Id: req.Msg.EventId,
	}), nil
}
