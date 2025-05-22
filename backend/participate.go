package main

import (
	"context"
	"crypto/ed25519"
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

	if len(req.Msg.Password) > zeni.MaxPasswordLen {
		return nil, errors.New("password too long")
	}

	participants := make([]*zeni.User, 0, len(req.Msg.Guests)+1)
	participants = append(participants, buyer)
	for _, guestEmail := range req.Msg.Guests {
		if guestEmail == authUser.Email {
			return nil, errors.New("guest has same email as buyer")
		}

		// XXX: support batch
		authGuest, err := s.Auth.EnsureUserExists(ctx, guestEmail)
		if err != nil {
			return nil, err
		}

		if slices.ContainsFunc(participants, func(added *zeni.User) bool { return authGuest.ID == added.AuthID }) {
			return nil, errors.New("duplicate guest")
		}

		// XXX: support batch
		guest, err := s.EnsureUserExists(ctx, authGuest)
		if err != nil {
			return nil, err
		}
		participants = append(participants, guest)
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

	needPasswordIfGuarded := true

	if err := s.DB.Tx(func(db zeni.DB) error {
		// XXX: can't create event with price for now but later we need to check that the event is free
		buyerRoles, err := db.UserRoles(req.Msg.EventId, buyer.ID)
		if err != nil {
			return err
		}
		if slices.Contains(buyerRoles, "organizer") {
			needPasswordIfGuarded = false
		}

		for i, ticket := range tickets {
			// XXX: support batch
			if err := db.Participate(req.Msg.EventId, buyer.ID, participants[i].ID, ticket.Secret(), req.Msg.Password, needPasswordIfGuarded); err != nil {
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

	// XXX: there could be race conditions if the db has changed password but the chain did not

	var eventSK ed25519.PrivateKey
	if needPasswordIfGuarded {
		if eventSK, err = zeni.EventSKFromPasswordHash(evt.PasswordHash); err != nil {
			return nil, err
		}
	}

	for i, ticket := range tickets {
		// XXX: support batch, this might be very very slow
		// XXX: callerID should be the current user and not creator,
		//      this could break if the initial creator has the organizer role removed
		//      also this bypasses password protection on-chain
		if err := s.Chain.Participate(req.Msg.EventId, evt.CreatorID, participants[i].ID, ticket.Pubkey(), eventSK); err != nil {
			// XXX: handle case where db tx pass but chain fail
			return nil, err
		}
	}

	if s.MailClient != nil && evt != nil {
		htmlStr, text, err := ticketsConfirmationMailContent(evt, "Welcome! Tickets are attached to this email.")
		if err != nil {
			s.Logger.Error("generate-participate-email-content", zap.Error(err))
		} else {
			attachments := make([]*resend.Attachment, 0, len(tickets))
			for _, ticket := range tickets {
				pdfData, err := GeneratePDFTicket(evt, ticket.Secret(), s.Logger)
				if err != nil {
					s.Logger.Error("generate-ticket-pdf", zap.Error(err), zap.String("ticket-id", ticket.Secret()))
					continue
				}
				attachments = append(attachments, &resend.Attachment{
					Content:     pdfData,
					Filename:    fmt.Sprintf("ticket_%s_%s.pdf", buyer.ID, evt.ID),
					ContentType: "application/pdf",
				})
			}

			if _, err := s.MailClient.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
				From:        "Zenao <ticket@mail.zenao.io>>",
				To:          append(req.Msg.Guests, authUser.Email),
				Subject:     fmt.Sprintf("%s - Confirmation", evt.Title),
				Html:        htmlStr,
				Text:        text,
				Attachments: attachments,
			}); err != nil {
				s.Logger.Error("send-participate-confirmation-email", zap.Error(err), zap.String("event-id", evt.ID), zap.String("buyer-id", buyer.ID))
			}
		}
	}

	return connect.NewResponse(&zenaov1.ParticipateResponse{}), nil
}
