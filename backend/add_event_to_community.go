package main

import (
	"context"
	"errors"
	"slices"

	"connectrpc.com/connect"
	"go.uber.org/zap"

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

	var (
		participants []*zeni.User
		evt          *zeni.Event
	)

	if err := s.DB.TxWithSpan(ctx, "db.AddEventToCommunity", func(tx zeni.DB) error {
		evt, err = tx.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleOrganizer) {
			return errors.New("you must be an organizer of the event to add it to a community")
		}

		participants, err = tx.GetOrgUsersWithRole(zeni.EntityTypeEvent, req.Msg.EventId, zeni.RoleParticipant)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	cmt, err := s.Chain.WithContext(ctx).GetCommunity(req.Msg.CommunityId)
	if err != nil {
		return nil, err
	}

	if err := s.Chain.WithContext(ctx).AddEventToCommunity(cmt.CreatorID, req.Msg.CommunityId, req.Msg.EventId); err != nil {
		s.Logger.Error("add-event-to-community-chain", zap.Error(err), zap.String("community-id", req.Msg.CommunityId), zap.String("event-id", req.Msg.EventId))
		return nil, err
	}

	// 1. retrieve member of the community
	members, err := s.Chain.WithContext(ctx).GetCommunityMembers(req.Msg.CommunityId)
	if err != nil {
		return nil, err
	}
	// TODO: its addr we have from members so it does not work now
	// Question is do we want to store the address in database or retrieve pkg path from chain and parse them to find the Id of the user
	var targetIDs = make(map[string]bool)
	for _, member := range members {
		targetIDs[member] = true
	}

	_ = participants
	_ = evt

	// for _, participant := range participants {
	// 	if !targetIDs[participant.ID] {
	// 		if err := s.Chain.WithContext(ctx).AddMemberToCommunity(cmt.CreatorID, req.Msg.CommunityId, participant.ID); err != nil {
	// 			s.Logger.Error("add-event-to-community-chain", zap.Error(err), zap.String("community-id", req.Msg.CommunityId), zap.String("participant-id", participant.ID))
	// 			return nil, err
	// 		}
	// 	}
	// }

	// // 1.

	// // If the event start in more than 24h, we send an email to all community members that does not participate to the event.
	// if time.Now().Add(24*time.Hour).Before(evt.StartDate) && s.MailClient != nil {
	// 	participantsIDS := make(map[string]bool)
	// 	for _, participant := range participants {
	// 		participantsIDS[participant.ID] = true
	// 	}

	// 	var authIDs []string
	// 	for _, target := range targets {
	// 		if !participantsIDS[target.ID] {
	// 			authIDs = append(authIDs, target.AuthID)
	// 		}
	// 	}
	// 	authTargets, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
	// 	if err != nil {
	// 		return nil, err
	// 	}

	// 	htmlStr, text, err := communityNewEventMailContent(evt, cmt)
	// 	if err != nil {
	// 		return nil, err
	// 	}

	// 	var requests []*resend.SendEmailRequest
	// 	for _, authTarget := range authTargets {
	// 		if authTarget.Email == "" {
	// 			s.Logger.Error("add-event-to-community", zap.String("target-id", authTarget.ID), zap.String("target-email", authTarget.Email), zap.Error(errors.New("target has no email")))
	// 			continue
	// 		}
	// 		requests = append(requests, &resend.SendEmailRequest{
	// 			From:    fmt.Sprintf("Zenao <%s>", s.MailSender),
	// 			To:      []string{authTarget.Email},
	// 			Subject: "New event by " + cmt.DisplayName + "!",
	// 			Html:    htmlStr,
	// 			Text:    text,
	// 		})
	// 	}
	// 	count := 0
	// 	s.Logger.Info("send-community-new-event-emails", zap.Int("count", len(requests)))
	// 	for i := 0; i < len(requests); i += 100 {
	// 		batch := requests[i:min(i+100, len(requests))]
	// 		if _, err := s.MailClient.Batch.SendWithContext(context.Background(), batch); err != nil {
	// 			s.Logger.Error("send-community-new-event-emails", zap.Error(err), zap.Int("batch-size", len(batch)))
	// 			continue
	// 		}
	// 		count += len(batch)
	// 		s.Logger.Info("send-community-new-event-emails", zap.Int("already-sent-count", count), zap.Int("total", len(requests)))
	// 	}
	// }

	return connect.NewResponse(&zenaov1.AddEventToCommunityResponse{}), nil
}
