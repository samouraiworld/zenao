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
	user := s.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("broadcast-event", zap.String("event-id", req.Msg.EventId), zap.String("user-id", string(userID)), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if len(req.Msg.Message) < 30 {
		return nil, errors.New("a broadcast message must contains at least 30 characters")
	}

	if s.MailClient == nil {
		return nil, errors.New("zenao mail client is not initialized")
	}

	evt := (*zeni.Event)(nil)
	var participants []*zeni.User
	if err := s.DB.Tx(func(db zeni.DB) error {
		evt, err = db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}
		participants, err = db.GetAllParticipants(req.Msg.EventId)
		if err != nil {
			return err
		}
		roles, err := db.UserRoles(userID, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, "organizer") {
			return errors.New("user is not organizer of the event")
		}
		return nil
	}); err != nil {
		return nil, err
	}

	idsList := make([]string, len(participants))
	for i, participant := range participants {
		idsList[i] = participant.ClerkID
	}
	clerkParticipants, err := s.GetUsersFromClerkIDs(ctx, idsList)
	if err != nil {
		return nil, err
	}
	htmlStr, text, err := eventBroadcastMailContent(evt, req.Msg.Message)
	if err != nil {
		return nil, err
	}
	var requests []*resend.SendEmailRequest
	for _, clerkParticipant := range clerkParticipants {
		if clerkParticipant.Email == "" {
			s.Logger.Error("event-broadcast-email-content", zap.String("clerk-id", clerkParticipant.ID), zap.String("email", clerkParticipant.Email))
			continue
		}
		requests = append(requests, &resend.SendEmailRequest{
			From:    "Zenao <broadcast@mail.zenao.io>",
			To:      []string{clerkParticipant.Email},
			Subject: fmt.Sprintf("Message from %s's organizer", evt.Title),
			Html:    htmlStr,
			Text:    text,
		})
	}
	// 100 emails at a time is the limit cf. https://resend.com/docs/api-reference/emails/send-batch-emails
	for i := 0; i < len(requests); i += 100 {
		batch := requests[i:min(i+100, len(requests))]
		if _, err := s.MailClient.Batch.SendWithContext(ctx, batch); err != nil {
			s.Logger.Error("send-event-broadcast-email", zap.Error(err))
		}
	}

	return connect.NewResponse(&zenaov1.BroadcastEventResponse{}), nil
}
