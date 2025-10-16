package main

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/mapsl"
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

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	eventRealmID := s.Chain.WithContext(ctx).EventRealmID(req.Msg.EventId)
	userRealmID := s.Chain.WithContext(ctx).UserRealmID(zUser.ID)
	evt, err := s.Chain.WithContext(ctx).GetEvent(eventRealmID)
	if err != nil {
		return nil, err
	}
	participants, err := s.Chain.WithContext(ctx).GetEventUsersByRole(eventRealmID, zeni.RoleParticipant)
	if err != nil {
		return nil, err
	}
	community, err := s.Chain.WithContext(ctx).GetEventCommunity(eventRealmID)
	if err != nil {
		return nil, err
	}
	if community != nil {
		// TODO: what happens if the user is not administrator anymore but was before ?
		// Option: fetch administrators of the community and use the first one as the one who remove the event from the community
		if err := s.Chain.WithContext(ctx).RemoveEventFromCommunity(userRealmID, community.PkgPath, req.Msg.EventId); err != nil {
			return nil, err
		}
	}

	if err := s.Chain.WithContext(ctx).CancelEvent(eventRealmID, userRealmID); err != nil {
		return nil, err
	}

	if s.MailClient != nil {
		zParticipants, err := s.DB.GetUsersByRealmIDs(participants)
		if err != nil {
			return nil, err
		}
		authIDs := mapsl.Map(zParticipants, func(u *zeni.User) string { return u.AuthID })
		authUsers, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
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
