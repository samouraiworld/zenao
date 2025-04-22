package main

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

// Participate implements zenaov1connect.ZenaoServiceHandler.
func (s *ZenaoServer) Participate(ctx context.Context, req *connect.Request[zenaov1.ParticipateRequest]) (*connect.Response[zenaov1.ParticipateResponse], error) {
	user := s.Auth.GetUser(ctx)

	if user == nil {
		if req.Msg.Email == "" {
			return nil, errors.New("no user and no email")
		}
		var err error
		user, err = s.Auth.CreateUser(ctx, req.Msg.Email)
		if err != nil {
			return nil, err
		}
	} else if req.Msg.Email != "" {
		return nil, errors.New("authenticating and providing an email are mutually exclusive")
	}

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	// retrieve auto-incremented user ID from database, do not use auth provider's user ID directly for realms
	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("participate", zap.String("event-id", req.Msg.EventId), zap.String("user-id", userID), zap.Bool("user-banned", user.Banned))

	evt := (*zeni.Event)(nil)

	if err := s.DB.Tx(func(db zeni.DB) error {
		// XXX: can't create event with price for now but later we need to check that the event is free

		if err := db.Participate(req.Msg.EventId, userID); err != nil {
			return err
		}

		evt, err = db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}

		if err := s.Chain.Participate(req.Msg.EventId, evt.CreatorID, userID); err != nil {
			// XXX: handle case where tx is broadcasted but we have an error afterwards, eg: chain has been updated but db rollbacked
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	if s.MailClient != nil && evt != nil {
		htmlStr, text, err := ticketsConfirmationMailContent(evt, "Welcome! Tickets will be sent in a few weeks!")
		if err != nil {
			s.Logger.Error("generate-participate-email-content", zap.Error(err))
		} else {
			// XXX: Replace sender name with organizer name
			if _, err := s.MailClient.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
				From:    "Zenao <ticket@mail.zenao.io>",
				To:      []string{user.Email},
				Subject: fmt.Sprintf("%s - Confirmation", evt.Title),
				Html:    htmlStr,
				Text:    text,
			}); err != nil {
				s.Logger.Error("send-participate-confirmation-email", zap.Error(err), zap.String("user-email", user.Email))
			}
		}
	}

	return connect.NewResponse(&zenaov1.ParticipateResponse{}), nil
}
