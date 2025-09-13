package main

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
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

	var users []*zeni.User
	var cmties []*zeni.Community
	var evt *zeni.Event
	if err := s.DB.WithContext(ctx).Tx(func(db zeni.DB) error {
		evt, err = db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}
		users, err = db.GetOrgUsers(zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if time.Now().Add(24 * time.Hour).After(evt.StartDate) {
			return errors.New("events already started or starting within 24h cannot be cancelled")
		}
		roles, err := db.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleOrganizer) {
			return errors.New("only organizers can cancel an event")
		}
		cmties, err = db.CommunitiesByEvent(req.Msg.EventId)
		if err != nil {
			return err
		}
		return db.CancelEvent(req.Msg.EventId)
	}); err != nil {
		return nil, err
	}

	if s.MailClient != nil {
		idsList := make([]string, 0, len(users))
		for _, u := range users {
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

	for _, cmt := range cmties {
		if err := s.Chain.WithContext(ctx).RemoveEventFromCommunity(cmt.CreatorID, cmt.ID, evt.ID); err != nil {
			s.Logger.Error("remove-cancelled-event-from-community", zap.Error(err), zap.String("event-id", evt.ID), zap.String("community-id", cmt.ID))
		}
	}

	if err := s.Chain.WithContext(ctx).CancelEvent(evt.ID, evt.CreatorID); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CancelEventResponse{}), nil
}
