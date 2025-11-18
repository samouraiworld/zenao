package main

import (
	"context"
	"crypto/ed25519"
	"errors"
	"fmt"
	"slices"
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

	evtRealmID := s.Chain.EventRealmID(req.Msg.EventId)
	buyerRealmID := s.Chain.UserRealmID(buyer.ID)
	needPasswordIfGuarded := true

	evt, err := s.Chain.WithContext(ctx).GetEvent(evtRealmID)
	if err != nil {
		return nil, err
	}
	cmt, err := s.Chain.WithContext(ctx).GetEventCommunity(evtRealmID)
	if err != nil {
		return nil, err
	}
	userRoles, err := s.Chain.WithContext(ctx).EntityRoles(buyerRealmID, evtRealmID, zeni.EntityTypeEvent)
	if err != nil {
		return nil, err
	}
	if slices.Contains(userRoles, zeni.RoleOrganizer) || evt.Privacy.GetPublic() != nil {
		needPasswordIfGuarded = false
	}

	var eventSK ed25519.PrivateKey
	if needPasswordIfGuarded {
		valid := true
		if guarded := evt.Privacy.GetGuarded(); guarded != nil {
			valid, err = zeni.ValidatePassword(req.Msg.Password, guarded.HashParams, guarded.ParticipationPubkey)
			if err != nil {
				return nil, err
			}
		}
		if !valid {
			return nil, errors.New("invalid event password")
		}
		if eventSK, err = zeni.EventSKFromPasswordHash(req.Msg.Password); err != nil {
			return nil, err
		}
	}

	for i, ticket := range tickets {
		// XXX: support batch, this might be very very slow
		// XXX: callerID should be the current user and not creator,
		//      this could break if the initial creator has the organizer role removed
		//      also this bypasses password protection on-chain
		if err := s.Chain.WithContext(ctx).Participate(evtRealmID, evt.Organizers[0], s.Chain.UserRealmID(participants[i].ID), ticket.Pubkey(), eventSK); err != nil {
			return nil, err
		}

		if cmt != nil {
			roles, err := s.Chain.WithContext(ctx).EntityRoles(s.Chain.UserRealmID(participants[i].ID), cmt.PkgPath, zeni.EntityTypeCommunity)
			if err != nil {
				return nil, err
			}
			if slices.Contains(roles, zeni.RoleMember) {
				continue
			}
			if err := s.Chain.WithContext(ctx).AddMemberToCommunity(cmt.Administrators[0], cmt.PkgPath, s.Chain.UserRealmID(participants[i].ID)); err != nil {
				return nil, err
			}
		}
	}

	if err := s.DB.TxWithSpan(ctx, "db.Participate", func(tx zeni.DB) error {
		for i, ticket := range tickets {
			// XXX: support batch
			participantRealmID := s.Chain.UserRealmID(participants[i].ID)
			if err := tx.Participate(buyer.ID, participants[i].ID, evtRealmID, buyerRealmID, participantRealmID, ticket.Secret()); err != nil {
				return err
			}
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

			htmlStr, text, err := ticketsConfirmationMailContent(req.Msg.EventId, evt, "Welcome! Tickets are attached to this email.")
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
					pdfData, err := GeneratePDFTicket(req.Msg.EventId, evt, ticket.Secret(), buyer.DisplayName, authUser.Email, time.Now(), s.Logger)
					if err != nil {
						s.Logger.Error("generate-ticket-pdf", zap.Error(err), zap.String("ticket-id", ticket.Secret()))
						continue
					}
					attachments = append(attachments, &resend.Attachment{
						Content:     pdfData,
						Filename:    fmt.Sprintf("ticket_%s_%s_%d.pdf", buyer.ID, req.Msg.EventId, i),
						ContentType: "application/pdf",
					})
					icsData := GenerateICS(req.Msg.EventId, evt, s.MailSender, s.Logger)
					attachments = append(attachments, &resend.Attachment{
						Content:     icsData,
						Filename:    fmt.Sprintf("zenao_events_%s.ics", req.Msg.EventId),
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
				s.Logger.Error("send-participate-confirmation-email", zap.Error(err), zap.String("event-id", req.Msg.EventId), zap.String("buyer-id", buyer.ID))
			}
		}()
	}

	return connect.NewResponse(&zenaov1.ParticipateResponse{}), nil
}
