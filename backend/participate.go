package main

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"slices"
	"strings"
	"sync"
	"time"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
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

	_, err := mail.ParseAddress(authUser.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid email address: %w", err)
	}

	domain := strings.Split(authUser.Email, "@")[1]
	if blacklistedDomains != nil && slices.Contains(blacklistedDomains, domain) {
		return nil, fmt.Errorf("email domain %s is not allowed", domain)
	}

	for _, guestEmail := range req.Msg.Guests {
		_, err := mail.ParseAddress(guestEmail)
		if err != nil {
			return nil, fmt.Errorf("invalid guest email address: %w", err)
		}

		guestDomain := strings.Split(guestEmail, "@")[1]
		if blacklistedDomains != nil && slices.Contains(blacklistedDomains, guestDomain) {
			return nil, fmt.Errorf("guest email domain %s is not allowed", guestDomain)
		}
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
		if authGuest.Banned {
			return nil, fmt.Errorf("user %s is banned", authGuest.Email)
		}
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
	rolesByParticipant := make([][]string, len(participants))

	if err := s.DB.TxWithSpan(ctx, "db.Participate", func(tx zeni.DB) error {
		// XXX: can't create event with price for now but later we need to check that the event is free
		buyerRoles, err := tx.EntityRoles(zeni.EntityTypeUser, buyer.ID, zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if slices.Contains(buyerRoles, zeni.RoleOrganizer) {
			needPasswordIfGuarded = false
		}

		communities, err = tx.CommunitiesByEvent(req.Msg.EventId)
		if err != nil {
			return err
		}

		for i, ticket := range tickets {
			// XXX: support batch
			if err := tx.Participate(req.Msg.EventId, buyer.ID, participants[i].ID, ticket.Secret(), req.Msg.Password, needPasswordIfGuarded); err != nil {
				return err
			}

			for _, cmt := range communities {
				roles, err := tx.EntityRoles(zeni.EntityTypeUser, participants[i].ID, zeni.EntityTypeCommunity, cmt.ID)
				if err != nil {
					return err
				}
				rolesByParticipant[i] = roles
				if slices.Contains(roles, zeni.RoleMember) {
					continue
				}
				if err := tx.AddMemberToCommunity(cmt.ID, participants[i].ID); err != nil {
					return err
				}
			}
		}

		evt, err = tx.GetEvent(req.Msg.EventId)
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

	wg := sync.WaitGroup{}
	defer wg.Wait()

	if s.MailClient != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			tracer := otel.Tracer("mail")
			ctx, span := tracer.Start(
				ctx,
				"mail.Participate",
				trace.WithSpanKind(trace.SpanKindClient),
			)
			defer span.End()

			htmlStr, text, err := ticketsConfirmationMailContent(evt, "Welcome! Tickets are attached to this email.")
			if err != nil {
				s.Logger.Error("generate-participate-email-content", zap.Error(err))
				return
			}

			attachments := make([]*resend.Attachment, 0, len(tickets))

			func() {
				_, span := tracer.Start(
					ctx,
					"generate tickets and ics",
					trace.WithSpanKind(trace.SpanKindClient),
				)
				defer span.End()
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
			}()

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
		}()
	}

	return connect.NewResponse(&zenaov1.ParticipateResponse{}), nil
}
