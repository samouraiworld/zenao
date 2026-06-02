package main

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

func (s *ZenaoServer) Participate(ctx context.Context, req *connect.Request[zenaov1.ParticipateRequest]) (*connect.Response[zenaov1.ParticipateResponse], error) {
	var (
		buyer        *zeni.User
		buyerEmail   string
		actingAsTeam bool
		err          error
	)

	// When X-Team-Id header is present, use GetActor which requires authentication.
	// Otherwise, support unauthenticated participation via email (can't use GetActor for this case).
	if req.Header().Get(TeamActorHeader) != "" {
		actor, err := s.GetActor(ctx, req.Header())
		if err != nil {
			return nil, err
		}
		buyer = actor.ActingAs
		buyerEmail = actor.AuthUser.Email
		actingAsTeam = true
	} else if authUser := s.Auth.GetUser(ctx); authUser != nil {
		if req.Msg.Email != "" {
			return nil, errors.New("authenticating and providing an email are mutually exclusive")
		}
		if err := validateEmailAddress(authUser.Email); err != nil {
			return nil, err
		}
		if authUser.Banned {
			return nil, errors.New("user is banned")
		}
		buyer, err = s.EnsureUserExists(ctx, authUser)
		if err != nil {
			return nil, err
		}
		buyerEmail = authUser.Email
	} else {
		if req.Msg.Email == "" {
			return nil, errors.New("no user and no email")
		}
		if err := validateEmailAddress(req.Msg.Email); err != nil {
			return nil, err
		}
		// Unauthenticated buyer: resolve via the guest model (no auth account
		// unless the email is already registered).
		buyerEmail = strings.ToLower(strings.TrimSpace(req.Msg.Email))
		buyerUsers, err := s.EnsureUsersFromEmails(ctx, []string{buyerEmail})
		if err != nil {
			return nil, err
		}
		buyer = buyerUsers[buyerEmail]
		if buyer == nil {
			return nil, errors.New("failed to resolve buyer")
		}
	}

	if err := validateEmailList(req.Msg.Guests); err != nil {
		return nil, err
	}

	s.Logger.Info("participate", zap.String("event-id", req.Msg.EventId), zap.String("buyer-id", buyer.ID), zap.Bool("acting-as-team", actingAsTeam))

	if err := validatePasswordLength(req.Msg.Password); err != nil {
		return nil, err
	}

	// Resolve guests via the guest model: registered emails reuse their auth
	// account, the rest become DB-only guest users (no auth provider seat).
	guestUsers, err := s.EnsureUsersFromEmails(ctx, req.Msg.Guests)
	if err != nil {
		return nil, err
	}

	buyerKey := strings.ToLower(strings.TrimSpace(buyerEmail))
	participants := []*zeni.User{buyer}
	participantEmails := []string{buyerEmail}
	seen := map[string]struct{}{buyerKey: {}}
	for _, email := range req.Msg.Guests {
		key := strings.ToLower(strings.TrimSpace(email))
		if key == buyerKey {
			return nil, errors.New("guest is buyer")
		}
		if _, dup := seen[key]; dup {
			return nil, errors.New("duplicate guest")
		}
		seen[key] = struct{}{}

		guest := guestUsers[key]
		if guest == nil {
			return nil, errors.New("failed to resolve guest")
		}
		participants = append(participants, guest)
		participantEmails = append(participantEmails, key)
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

			// Bundle every ticket (the buyer's own plus any guest's) into a
			// single email addressed to the buyer. The QR codes are entry
			// tokens, so they are never sent to guest-provided emails which
			// could contain a typo and leak access.
			items := make([]ticketEmailItem, 0, len(tickets))
			func() {
				_, span := tracer.Start(
					ctx,
					"generate tickets and ics",
					trace.WithSpanKind(trace.SpanKindClient),
				)
				defer span.End()
				for i := range tickets {
					items = append(items, ticketEmailItem{
						Secret:      tickets[i].Secret(),
						DisplayName: participants[i].DisplayName,
						Email:       participantEmails[i],
					})
				}
			}()

			qrs, attachments, err := buildTicketEmailAttachments(evt, items, s.MailSender, s.Logger)
			if err != nil {
				s.Logger.Error("generate-participate-attachments", zap.Error(err), zap.String("event-id", evt.ID), zap.String("buyer-id", buyer.ID))
				return
			}

			htmlStr, text, err := ticketsConfirmationMailContent(evt, "Welcome! Your tickets are attached and shown below.", qrs)
			if err != nil {
				s.Logger.Error("generate-participate-email-content", zap.Error(err))
				return
			}

			// XXX: Replace sender name with organizer name
			if _, err := s.MailClient.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
				From:        fmt.Sprintf("Zenao <%s>", s.MailSender),
				To:          []string{buyerEmail},
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
