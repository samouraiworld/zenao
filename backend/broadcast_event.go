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

func (s *ZenaoServer) BroadcastEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.BroadcastEventRequest],
) (*connect.Response[zenaov1.BroadcastEventResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("broadcast-event", zap.String("event-id", req.Msg.EventId), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if zUser.Plan != zeni.ProPlan {
		return nil, errors.New("broadcast feature is only available for pro users")
	}

	if len(req.Msg.Message) < 30 || len(req.Msg.Message) > 5000 {
		return nil, errors.New("a broadcast message must contains between 30 and 5000 characters")
	}

	if s.MailClient == nil {
		return nil, errors.New("zenao mail client is not initialized")
	}

	evt, err := s.Chain.WithContext(ctx).GetEvent(req.Msg.EventId)
	if err != nil {
		return nil, err
	}
	roles, err := s.Chain.WithContext(ctx).EntityRoles(zUser.ID, zeni.EntityTypeEvent, req.Msg.EventId)
	if err != nil {
		return nil, err
	}
	if !slices.Contains(roles, zeni.RoleOrganizer) {
		return nil, errors.New("user is not organizer of the event")
	}
	participants, err := s.Chain.WithContext(ctx).GetEventUsersByRole(req.Msg.EventId, zeni.RoleParticipant)
	if err != nil {
		return nil, err
	}
	// TODO: retrieve only if req.Msg.AttachTicket but how to retrieve ticket from chain efficiently ?
	tickets := make(map[string][]*zeni.SoldTicket)

	if len(participants) == 0 {
		return nil, errors.New("a broadcast message cannot be sent to an event without any participants")
	}

	idsList := make([]string, len(participants))
	// TODO: fix
	// for i, participant := range participants {
	// 	idsList[i] = participant.AuthID
	// }
	authParticipants, err := s.Auth.GetUsersFromIDs(ctx, idsList)
	if err != nil {
		return nil, err
	}
	htmlStr, text, err := eventBroadcastMailContent(req.Msg.EventId, evt, req.Msg.Message)
	if err != nil {
		return nil, err
	}
	var requests []*resend.SendEmailRequest
	for _, authParticipant := range authParticipants {
		if authParticipant.Email == "" {
			s.Logger.Error("event-broadcast-email-content", zap.String("auth-id", authParticipant.ID), zap.String("email", authParticipant.Email))
			continue
		}
		attachments := make([]*resend.Attachment, 0, len(tickets))
		if req.Msg.AttachTicket {
			for i, ticket := range tickets[authParticipant.ID] {
				pdfData, err := GeneratePDFTicket(req.Msg.EventId, evt, ticket.Ticket.Secret(), ticket.User.DisplayName, authParticipant.Email, ticket.CreatedAt, s.Logger)
				if err != nil {
					s.Logger.Error("generate-ticket-pdf", zap.Error(err), zap.String("ticket-id", ticket.Ticket.Secret()))
					return nil, err
				}
				attachments = append(attachments, &resend.Attachment{
					Content:     pdfData,
					Filename:    fmt.Sprintf("ticket_%s_%s_%d.pdf", ticket.BuyerID, req.Msg.EventId, i),
					ContentType: "application/pdf",
				})
			}
		}

		requests = append(requests, &resend.SendEmailRequest{
			From:        fmt.Sprintf("Zenao <%s>", s.MailSender),
			To:          []string{authParticipant.Email},
			Subject:     fmt.Sprintf("Message from %s's organizer", evt.Title),
			Html:        htmlStr,
			Text:        text,
			Attachments: attachments,
		})
	}

	count := 0
	s.Logger.Info("broadcast-event-starting-send-mails", zap.Int("requests-count", len(requests)), zap.Bool("attach-ticket", req.Msg.AttachTicket))
	if req.Msg.AttachTicket {
		// cannot batch send w/ attachments: https://resend.com/docs/api-reference/emails/send-batch-emails
		for _, request := range requests {
			if _, err := s.MailClient.Emails.SendWithContext(context.Background(), request); err != nil {
				s.Logger.Error("send-event-broadcast-email", zap.Error(err))
				continue
			}
			count++
			if count%50 == 0 {
				s.Logger.Info("broadcast-event-sent-emails", zap.Int("already-sent-count", count), zap.Int("total", len(requests)))
			}
		}
	} else {
		// 100 emails at a time is the limit cf. https://resend.com/docs/api-reference/emails/send-batch-emails
		for i := 0; i < len(requests); i += 100 {
			batch := requests[i:min(i+100, len(requests))]
			if _, err := s.MailClient.Batch.SendWithContext(context.Background(), batch); err != nil {
				s.Logger.Error("send-event-broadcast-email", zap.Error(err))
				continue
			}
			count += len(batch)
			s.Logger.Info("broadcast-event-sent-emails", zap.Int("already-sent-count", count), zap.Int("total", len(requests)))
		}
	}

	s.Logger.Info("broadcast-event-emails-sent", zap.Int("total-sent", count), zap.Int("total-to-send", len(requests)))

	return connect.NewResponse(&zenaov1.BroadcastEventResponse{}), nil
}
