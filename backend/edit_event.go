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

func (s *ZenaoServer) EditEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.EditEventRequest],
) (*connect.Response[zenaov1.EditEventResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	// retrieve auto-incremented user ID from database, do not use auth provider's user ID directly for realms
	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("edit-event", zap.String("event-id", req.Msg.EventId), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	authOrgas, err := s.Auth.EnsureUsersExists(ctx, req.Msg.Organizers)
	if err != nil {
		return nil, err
	}

	//XXX: refactor the logic to avoid duplicate w/ gkps ?
	var organizersRealmIDs []string
	organizersRealmIDs = append(organizersRealmIDs, s.Chain.UserRealmID(zUser.ID))
	for _, authOrg := range authOrgas {
		if authOrg.Banned {
			return nil, fmt.Errorf("user %s is banned", authOrg.Email)
		}
		zOrg, err := s.EnsureUserExists(ctx, authOrg)
		if err != nil {
			return nil, err
		}
		orgRealmID := s.Chain.UserRealmID(zOrg.ID)
		if slices.Contains(organizersRealmIDs, orgRealmID) {
			return nil, fmt.Errorf("duplicate organizer: %s", authOrg.Email)
		}
		organizersRealmIDs = append(organizersRealmIDs, orgRealmID)
	}

	authGkps, err := s.Auth.EnsureUsersExists(ctx, req.Msg.Gatekeepers)
	if err != nil {
		return nil, err
	}

	var gatekeepersRealmIDs []string
	for _, authGkp := range authGkps {
		if authGkp.Banned {
			return nil, fmt.Errorf("user %s is banned", authGkp.Email)
		}
		zGkp, err := s.EnsureUserExists(ctx, authGkp)
		if err != nil {
			return nil, err
		}
		gkpRealmID := s.Chain.UserRealmID(zGkp.ID)
		if slices.Contains(gatekeepersRealmIDs, gkpRealmID) {
			return nil, fmt.Errorf("duplicate gatekeeper: %s", authGkp.Email)
		}
		gatekeepersRealmIDs = append(gatekeepersRealmIDs, gkpRealmID)
	}

	if err := validateEvent(req.Msg.StartDate, req.Msg.EndDate, req.Msg.Title, req.Msg.Description, req.Msg.Location, req.Msg.ImageUri, req.Msg.Capacity, req.Msg.TicketPrice, req.Msg.Password); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	eventRealmID := s.Chain.EventRealmID(req.Msg.EventId)
	userRealmID := s.Chain.UserRealmID(zUser.ID)
	cmtRealmID := s.Chain.CommunityRealmID(req.Msg.CommunityId)
	evt, err := s.Chain.WithContext(ctx).GetEvent(eventRealmID)
	if err != nil {
		return nil, err
	}

	cmt, err := s.Chain.WithContext(ctx).GetEventCommunity(eventRealmID)
	if err != nil {
		return nil, err
	}

	passwordHash, err := zeni.NewPasswordHash(req.Msg.Password)
	if err != nil {
		return nil, err
	}

	privacy, _, err := zeni.EventPrivacyFromPasswordHash(passwordHash)
	if err != nil {
		return nil, err
	}

	// XXX: how to have atomicity on these operations ?
	if err := s.Chain.WithContext(ctx).EditEvent(eventRealmID, userRealmID, organizersRealmIDs, gatekeepersRealmIDs, req.Msg, privacy); err != nil {
		return nil, err
	}

	if cmt != nil && cmt.PkgPath != cmtRealmID {
		if err := s.Chain.WithContext(ctx).RemoveEventFromCommunity(cmt.Administrators[0], cmt.PkgPath, eventRealmID); err != nil {
			return nil, err
		}
	}
	participants, err := s.Chain.WithContext(ctx).GetEventUsersByRole(eventRealmID, zeni.RoleParticipant)
	if err != nil {
		return nil, err
	}
	var members []*zeni.User
	if req.Msg.CommunityId != "" {
		membersRealmIDs, err := s.Chain.WithContext(ctx).GetCommunityUsersByRole(cmtRealmID, zeni.RoleMember)
		if err != nil {
			return nil, err
		}
		members, err = s.DB.GetUsersByRealmIDs(membersRealmIDs)
		if err != nil {
			return nil, err
		}
	}

	var newCmt *zenaov1.CommunityInfo
	if req.Msg.CommunityId != "" && (cmt == nil || cmt.PkgPath != cmtRealmID) {
		newCmt, err = s.Chain.WithContext(ctx).GetCommunity(cmtRealmID)
		if err != nil {
			return nil, err
		}
		memberIDs := make(map[string]bool)
		for _, m := range members {
			memberIDs[m.ID] = true
		}

		if err := s.Chain.WithContext(ctx).AddEventToCommunity(userRealmID, cmtRealmID, eventRealmID); err != nil {
			return nil, err
		}

		newMembers := make([]string, 0, len(participants))
		for _, participant := range participants {
			if !memberIDs[participant] {
				newMembers = append(newMembers, participant)
			}
		}
		if len(newMembers) > 0 {
			if err := s.Chain.WithContext(context.Background()).AddMembersToCommunity(userRealmID, cmtRealmID, newMembers); err != nil {
				s.Logger.Error("add-members-to-community", zap.String("community-id", req.Msg.CommunityId), zap.Strings("new-members", newMembers), zap.Error(err))
			}
		}
	}

	startDate := time.Unix(evt.StartDate, 0).In(time.UTC)
	if newCmt != nil && time.Now().Add(24*time.Hour).Before(startDate) && req.Msg.CommunityEmail && s.MailClient != nil {
		participantsIDS := make(map[string]bool)
		for _, participant := range participants {
			participantsIDS[participant] = true
		}

		var authIDs []string
		for _, member := range members {
			if !participantsIDS[member.ID] {
				authIDs = append(authIDs, member.AuthID)
			}
		}
		authTargets, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
		if err != nil {
			return nil, err
		}

		htmlStr, text, err := communityNewEventMailContent(req.Msg.EventId, evt, req.Msg.CommunityId, newCmt)
		if err != nil {
			return nil, err
		}

		var requests []*resend.SendEmailRequest
		for _, authTarget := range authTargets {
			if authTarget.Email == "" {
				s.Logger.Error("edit-event", zap.String("target-id", authTarget.ID), zap.String("target-email", authTarget.Email), zap.Error(errors.New("target has no email")))
				continue
			}
			requests = append(requests, &resend.SendEmailRequest{
				From:    fmt.Sprintf("Zenao <%s>", s.MailSender),
				To:      []string{authTarget.Email},
				Subject: "New event by " + newCmt.DisplayName + "!",
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

	return connect.NewResponse(&zenaov1.EditEventResponse{
		Id: req.Msg.EventId,
	}), nil
}
