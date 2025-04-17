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

func (s *ZenaoServer) EditEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.EditEventRequest],
) (*connect.Response[zenaov1.EditEventResponse], error) {
	user := s.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	// retrieve auto-incremented user ID from database, do not use clerk's user ID directly for realms
	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("edit-event", zap.String("event-id", req.Msg.EventId), zap.String("user-id", string(userID)), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := validateEvent(req.Msg.StartDate, req.Msg.EndDate, req.Msg.Title, req.Msg.Description, req.Msg.Location, req.Msg.ImageUri, req.Msg.Capacity, req.Msg.TicketPrice); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	evt := (*zeni.Event)(nil)
	participants := []*zeni.User{}
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

		if err := db.EditEvent(req.Msg.EventId, req.Msg); err != nil {
			return err
		}

		if err := s.Chain.EditEvent(req.Msg.EventId, userID, req.Msg); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	if s.MailClient != nil && req.Msg.NotifyParticipants {
		for _, participant := range participants {
			displayName := "Anon"
			if participant.DisplayName != "" {
				displayName = participant.DisplayName
			}
			htmlStr, text, err := notifyParticipantsEventEditedMailContent(evt, displayName)
			if err != nil {
				s.Logger.Error("generate-notify-participants-event-edited-email-content", zap.Error(err))
			} else {
				target, err := s.GetUserFromClerkID(ctx, participant.ClerkID)
				if err != nil {
					s.Logger.Error("get-user-from-clerk-id", zap.Error(err))
				}
				if _, err := s.MailClient.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
					From:    "Zenao <ticket@mail.zenao.io>",
					To:      []string{target.Email},
					Subject: fmt.Sprintf("%s - Event updated", evt.Title),
					Html:    htmlStr,
					Text:    text,
				}); err != nil {
					s.Logger.Error("send-notify-participants-event-edited-email", zap.Error(err), zap.String("user-email", user.Email))
				}
			}
		}
	}

	return connect.NewResponse(&zenaov1.EditEventResponse{
		Id: req.Msg.EventId,
	}), nil
}
