package main

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
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

	if req.Msg.TicketPrice != 0 {
		return nil, errors.New("event with price is not supported")
	}

	// TODO: validate request

	evt := (*Event)(nil)

	if err := s.DBTx(func(db ZenaoDB) error {
		var err error
		if evt, err = db.CreateEvent(userID, req.Msg); err != nil {
			return err
		}

		if err := s.Chain.CreateEvent(fmt.Sprintf("%d", evt.ID), userID, req.Msg); err != nil {
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
		Id: fmt.Sprintf("%d", evt.ID),
	}), nil
}
