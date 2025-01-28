package main

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) EditEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.EditEventRequest],
) (*connect.Response[zenaov1.EditEventResponse], error) {
	user := s.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	// retrieve auto-incremented user ID from database, do not use clerk's user ID directly for realms
	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("edit-event", zap.String("event-id", req.Msg.EventId), zap.String("user-id", string(userID)), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := validateEvent(req.Msg.StartDate, req.Msg.EndDate, req.Msg.Title, req.Msg.Description, req.Msg.ImageUri, req.Msg.Capacity, req.Msg.TicketPrice); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	var event *Event
	if err := s.DBTx(func(db ZenaoDB) error {
		var err error
		event, err = db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}

		// TODO: we should keep track of the roles in database
		// for now, only the creator can edit the event but all organizers should be able to
		if fmt.Sprintf("%d", event.CreatorID) != userID {
			return errors.New("user is not the creator of the event")
		}

		if err := db.EditEvent(req.Msg.EventId, req.Msg); err != nil {
			return err
		}

		if err := s.Chain.EditEvent(req.Msg.EventId, req.Msg); err != nil {
			s.Logger.Error("edit-event", zap.Error(err))
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EditEventResponse{
		Id: req.Msg.EventId,
	}), nil
}
