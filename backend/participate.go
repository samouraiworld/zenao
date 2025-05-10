package main

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

// Participate implements zenaov1connect.ZenaoServiceHandler.
func (s *ZenaoServer) Participate(ctx context.Context, req *connect.Request[zenaov1.ParticipateRequest]) (*connect.Response[zenaov1.ParticipateResponse], error) {
	authUser := s.Auth.GetUser(ctx)

	if authUser == nil {
		if req.Msg.Email == "" {
			return nil, errors.New("no user and no email")
		}
		var err error
		authUser, err = s.Auth.EnsureUserExists(ctx, req.Msg.Email)
		if err != nil {
			return nil, err
		}
	} else if req.Msg.Email != "" {
		return nil, errors.New("authenticating and providing an email are mutually exclusive")
	}

	if authUser.Banned {
		return nil, errors.New("user is banned")
	}

	// retrieve auto-incremented user ID from database, do not use auth provider's user ID directly for realms
	buyer, err := s.EnsureUserExists(ctx, authUser)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("participate", zap.String("event-id", req.Msg.EventId), zap.String("user-id", buyer.ID), zap.Bool("user-banned", authUser.Banned))

	participants := make([]*zeni.User, len(req.Msg.Guests)+1)
	participants[0] = buyer
	for i, guestEmail := range req.Msg.Guests {
		if guestEmail == authUser.Email {
			return nil, errors.New("guest has same email as buyer")
		}

		authGuest, err := s.Auth.EnsureUserExists(ctx, guestEmail)
		if err != nil {
			return nil, err
		}

		if slices.ContainsFunc(participants, func(added *zeni.User) bool { return authGuest.ID == added.AuthID }) {
			return nil, errors.New("duplicate guest")
		}

		guest, err := s.EnsureUserExists(ctx, authGuest)
		if err != nil {
			return nil, err
		}
		participants[i+1] = guest
	}

	tickets := make([]*zeni.Ticket, len(participants))
	for i := range len(tickets) {
		ticket, err := zeni.NewTicket()
		if err != nil {
			return nil, err
		}
		tickets[i] = ticket
	}

	evt := (*zeni.Event)(nil)

	if err := s.DB.Tx(func(db zeni.DB) error {
		// XXX: can't create event with price for now but later we need to check that the event is free

		for i, ticket := range tickets {
			if err := db.Participate(req.Msg.EventId, buyer.ID, participants[i].ID, ticket.Secret()); err != nil {
				return err
			}
		}

		evt, err = db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	for i, ticket := range tickets {
		if err := s.Chain.Participate(req.Msg.EventId, evt.CreatorID, participants[i].ID, ticket.Pubkey()); err != nil {
			// XXX: handle case where db tx pass but chain fail
			return nil, err
		}
	}

	if s.MailClient != nil && evt != nil {
		htmlStr, text, err := ticketsConfirmationMailContent(evt, "Welcome! Tickets will be sent in a few weeks!")
		if err != nil {
			s.Logger.Error("generate-participate-email-content", zap.Error(err))
		} else {
			// XXX: Replace sender name with organizer name
			if _, err := s.MailClient.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
				From:    "Zenao <ticket@mail.zenao.io>",
				To:      append(req.Msg.Guests, authUser.Email),
				Subject: fmt.Sprintf("%s - Confirmation", evt.Title),
				Html:    htmlStr,
				Text:    text,
			}); err != nil {
				s.Logger.Error("send-participate-confirmation-email", zap.Error(err), zap.String("event-id", evt.ID), zap.String("buyer-id", buyer.ID))
			}
		}
	}

	return connect.NewResponse(&zenaov1.ParticipateResponse{}), nil
}
