package main

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CancelEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.CancelEventRequest],
) (*connect.Response[zenaov1.CancelEventResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("cancel-event", zap.String("event-id", req.Msg.EventId), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	evt, err := s.Chain.WithContext(ctx).GetEvent(req.Msg.EventId)
	if err != nil {
		return nil, err
	}
	participants, err := s.Chain.WithContext(ctx).GetEventParticipants(req.Msg.EventId)
	if err != nil {
		return nil, err
	}
	cmt, err := s.Chain.WithContext(ctx).GetCommunity(evt.CommunityID)
	if err != nil {
		return nil, err
	}

	// TODO: what happens if the user is not administrator anymore but was before ?
	if err := s.Chain.WithContext(ctx).RemoveEventFromCommunity(zUser.ID, cmt.ID, evt.ID); err != nil {
		return nil, err
	}

	if err := s.Chain.WithContext(ctx).CancelEvent(evt.ID, zUser.ID); err != nil {
		return nil, err
	}

	if s.MailClient != nil {
		idsList := make([]string, 0, len(participants))
		for _, u := range participants {
			idsList = append(idsList, u.AuthID)
		}
		authUsers, err := s.Auth.GetUsersFromIDs(ctx, idsList)
		if err != nil {
			return nil, err
		}
		htmlStr, textStr, err := eventCancelledMailContent(evt)
		if err != nil {
			return nil, err
		}
		var requests []*resend.SendEmailRequest
		for _, authUser := range authUsers {
			requests = append(requests, &resend.SendEmailRequest{
				From:    fmt.Sprintf("Zenao <%s>", s.MailSender),
				To:      []string{authUser.Email},
				Subject: "Event cancelled: " + evt.Title,
				Html:    htmlStr,
				Text:    textStr,
			})
		}

		count := 0
		for i := 0; i < len(requests); i += 100 {
			batch := requests[i:min(i+100, len(requests))]
			if _, err := s.MailClient.Batch.SendWithContext(context.Background(), batch); err != nil {
				s.Logger.Error("send-event-broadcast-email", zap.Error(err))
				continue
			}
			count += len(batch)
			s.Logger.Info("send-event-cancellation-email", zap.Int("already-sent", count), zap.Int("total", len(requests)))
		}
	}

	return connect.NewResponse(&zenaov1.CancelEventResponse{}), nil
}
