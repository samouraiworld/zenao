package main

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"connectrpc.com/connect"
	"go.uber.org/zap"

	"github.com/resend/resend-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) AddEventToCommunity(
	ctx context.Context,
	req *connect.Request[zenaov1.AddEventToCommunityRequest],
) (*connect.Response[zenaov1.AddEventToCommunityResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("add-event-to-community", zap.String("event-id", req.Msg.EventId), zap.String("community-id", req.Msg.CommunityId), zap.String("user-id", zUser.ID))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	cmtRealmID := s.Chain.CommunityRealmID(req.Msg.CommunityId)
	evtRealmID := s.Chain.EventRealmID(req.Msg.EventId)
	userRealmID := s.Chain.UserRealmID(zUser.ID)

	cmt, err := s.Chain.WithContext(ctx).GetCommunity(cmtRealmID)
	if err != nil {
		return nil, err
	}
	evt, err := s.Chain.WithContext(ctx).GetEvent(evtRealmID)
	if err != nil {
		return nil, err
	}

	// XXX: does this check on-chain ?
	entityRoles, err := s.Chain.WithContext(ctx).EntityRoles(userRealmID, evtRealmID, zeni.EntityTypeEvent)
	if err != nil {
		return nil, err
	}
	if !slices.Contains(entityRoles, zeni.RoleOrganizer) {
		return nil, errors.New("user is not organizer of the event")
	}

	participantsRealmIDs, err := s.Chain.WithContext(ctx).GetEventUsersByRole(evtRealmID, zeni.RoleParticipant)
	if err != nil {
		return nil, err
	}

	membersRealmIDs, err := s.Chain.WithContext(ctx).GetCommunityUsersByRole(cmtRealmID, zeni.RoleMember)
	if err != nil {
		return nil, err
	}

	if err := s.Chain.WithContext(ctx).AddEventToCommunity(cmt.Administrators[0], cmtRealmID, evtRealmID); err != nil {
		s.Logger.Error("add-event-to-community-chain", zap.Error(err), zap.String("community-id", req.Msg.CommunityId), zap.String("event-id", req.Msg.EventId))
		return nil, err
	}

	var membersMap = make(map[string]bool)
	for _, memberRealmID := range membersRealmIDs {
		membersMap[memberRealmID] = true
	}

	for _, participantRealmID := range participantsRealmIDs {
		if membersMap[participantRealmID] {
			continue
		}
		if err := s.Chain.WithContext(ctx).AddMemberToCommunity(cmt.Administrators[0], cmtRealmID, participantRealmID); err != nil {
			s.Logger.Error("add-event-to-community-chain", zap.Error(err), zap.String("community-id", req.Msg.CommunityId), zap.String("participant-realm-id", participantRealmID))
			return nil, err
		}
	}

	// If the event start in more than 24h, we send an email to all community members that does not participate to the event.
	startDate := time.Unix(evt.StartDate, 0).In(time.UTC)
	if time.Now().Add(24*time.Hour).Before(startDate) && s.MailClient != nil {
		zMembers, err := s.DB.WithContext(ctx).GetUsersByRealmIDs(membersRealmIDs)
		if err != nil {
			return nil, err
		}
		participantsMap := make(map[string]bool)
		for _, participantRealmID := range participantsRealmIDs {
			participantsMap[participantRealmID] = true
		}

		var authIDs []string
		for _, zMember := range zMembers {
			if !participantsMap[zMember.RealmID] {
				authIDs = append(authIDs, zMember.AuthID)
			}
		}
		authTargets, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
		if err != nil {
			return nil, err
		}

		htmlStr, text, err := communityNewEventMailContent(evtRealmID, evt, cmtRealmID, cmt)
		if err != nil {
			return nil, err
		}

		var requests []*resend.SendEmailRequest
		for _, authTarget := range authTargets {
			if authTarget.Email == "" {
				s.Logger.Error("add-event-to-community", zap.String("target-id", authTarget.ID), zap.String("target-email", authTarget.Email), zap.Error(errors.New("target has no email")))
				continue
			}
			requests = append(requests, &resend.SendEmailRequest{
				From:    fmt.Sprintf("Zenao <%s>", s.MailSender),
				To:      []string{authTarget.Email},
				Subject: "New event by " + cmt.DisplayName + "!",
				Html:    htmlStr,
				Text:    text,
			})
		}
		count := 0
		s.Logger.Info("send-community-new-event-emails", zap.Int("count", len(requests)))
		for i := 0; i < len(requests); i += 100 {
			batch := requests[i:min(i+100, len(requests))]
			if _, err := s.MailClient.Batch.SendWithContext(context.Background(), batch); err != nil {
				s.Logger.Error("send-community-new-event-emails", zap.Error(err), zap.Int("batch-size", len(batch)))
				continue
			}
			count += len(batch)
			s.Logger.Info("send-community-new-event-emails", zap.Int("already-sent-count", count), zap.Int("total", len(requests)))
		}
	}

	return connect.NewResponse(&zenaov1.AddEventToCommunityResponse{}), nil
}
