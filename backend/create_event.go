package main

import (
	"context"
	"errors"
	"fmt"
	"net/url"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreateEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.CreateEventRequest],
) (*connect.Response[zenaov1.CreateEventResponse], error) {
	user := s.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	// retrieve auto-incremented user ID from database, do not use clerk's user ID directly for realms
	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("create-event", zap.String("title", req.Msg.Title), zap.String("user-id", string(userID)), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := validateEvent(req.Msg.StartDate, req.Msg.EndDate, req.Msg.Title, req.Msg.Description, req.Msg.Location, req.Msg.ImageUri, req.Msg.Capacity, req.Msg.TicketPrice); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	evt := (*zeni.Event)(nil)

	if err := s.DB.Tx(func(db zeni.DB) error {
		var err error
		if evt, err = db.CreateEvent(userID, req.Msg); err != nil {
			return err
		}

		if err := s.Chain.CreateEvent(evt.ID, userID, req.Msg); err != nil {
			s.Logger.Error("create-event", zap.Error(err))
			return err
		}

		if s.MailClient != nil {
			htmlStr, err := generateCreationConfirmationMailHTML(evt)
			if err != nil {
				return err
			}

			// XXX: Replace sender name with organizer name
			if _, err := s.MailClient.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
				From:    "Zenao <noreply@mail.zenao.io>",
				To:      []string{user.Email},
				Subject: fmt.Sprintf("%s - Creation confirmed", evt.Title),
				Html:    htmlStr,
				Text:    generateCreationConfirmationMailText(evt),
			}); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreateEventResponse{
		Id: evt.ID,
	}), nil
}

func validateEvent(startDate, endDate uint64, title, description, location, imageURI string, capacity uint32, ticketPrice float64) error {
	if startDate >= endDate {
		return errors.New("end date must be after start date")
	}
	if len(title) < 2 || len(title) > 140 {
		return errors.New("title must be of length 2 to 140")
	}
	if len(description) < 10 || len(description) > 10000 {
		return errors.New("event description must be of length 10 to 10000")
	}
	if len(location) < 2 || len(location) > 400 {
		return errors.New("title must be of length 2 to 400")
	}
	if len(imageURI) == 0 || len(imageURI) > 400 {
		return errors.New("image uri must be of length 1 to 400")
	}
	if _, err := url.Parse(imageURI); err != nil {
		return fmt.Errorf("invalid image uri: %w", err)
	}
	if capacity <= 0 {
		return errors.New("capacity must be greater than 0")
	}
	if ticketPrice != 0 {
		return errors.New("event with price is not supported")
	}
	return nil
}
