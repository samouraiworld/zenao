package main

import (
	"context"
	"crypto/ed25519"
	"errors"
	"fmt"
	"slices"
	"time"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/mapsl"
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

	authGuests, err := s.Auth.EnsureUsersExists(ctx, req.Msg.Guests)
	if err != nil {
		return nil, err
	}

	participants := []*zeni.User{buyer}
	for _, authGuest := range authGuests {
		if authGuest.ID == authUser.ID {
			return nil, errors.New("guest is buyer")
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

	tickets, err := mapsl.MapRangeErr(len(participants), zeni.NewTicket)
	if err != nil {
		return nil, err
	}

	evt := (*zeni.Event)(nil)
	communities := ([]*zeni.Community)(nil)
	needPasswordIfGuarded := true

	if err := s.DB.Tx(func(db zeni.DB) error {
		// XXX: can't create event with price for now but later we need to check that the event is free
		buyerRoles, err := db.EntityRoles(zeni.EntityTypeUser, buyer.ID, zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if slices.Contains(buyerRoles, zeni.RoleOrganizer) {
			needPasswordIfGuarded = false
		}

		communities, err = db.CommunitiesByEvent(req.Msg.EventId)
		if err != nil {
			return err
		}

		for i, ticket := range tickets {
			// XXX: support batch
			if err := db.Participate(req.Msg.EventId, buyer.ID, participants[i].ID, ticket.Secret(), req.Msg.Password, needPasswordIfGuarded); err != nil {
				return err
			}

			for _, cmt := range communities {
				if err := db.AddMemberToCommunity(cmt.ID, participants[i].ID); err != nil {
					return err
				}
			}
		}

		evt, err = db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}

		if evt == nil {
			return errors.New("nil event after participate")
		}

		return nil
	}); err != nil {
		return nil, err
	}

	if s.MailClient != nil {
		htmlStr, text, err := ticketsConfirmationMailContent(evt, "Welcome! Tickets are attached to this email.")
		if err != nil {
			s.Logger.Error("generate-participate-email-content", zap.Error(err))
		} else {
			attachments := make([]*resend.Attachment, 0, len(tickets))
			for i, ticket := range tickets {
				pdfData, err := GeneratePDFTicket(evt, ticket.Secret(), buyer.DisplayName, authUser.Email, time.Now(), s.Logger)
				if err != nil {
					s.Logger.Error("generate-ticket-pdf", zap.Error(err), zap.String("ticket-id", ticket.Secret()))
					continue
				}
				attachments = append(attachments, &resend.Attachment{
					Content:     pdfData,
					Filename:    fmt.Sprintf("ticket_%s_%s_%d.pdf", buyer.ID, evt.ID, i),
					ContentType: "application/pdf",
				})
				icsData := GenerateICS(evt, s.MailSender, s.Logger)
				attachments = append(attachments, &resend.Attachment{
					Content:     icsData,
					Filename:    fmt.Sprintf("zenao_events_%s.ics", evt.ID),
					ContentType: "text/calendar",
				})
			}

			// XXX: Replace sender name with organizer name
			if _, err := s.MailClient.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
				From:        fmt.Sprintf("Zenao <%s>", s.MailSender),
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

		for _, cmt := range communities {
			if err := s.Chain.AddMemberToCommunity(cmt.CreatorID, cmt.ID, participants[i].ID); err != nil {
				return nil, err
			}
		}
	}

	return connect.NewResponse(&zenaov1.ParticipateResponse{}), nil
}
