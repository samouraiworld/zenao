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
	var organizersIDs []string
	organizersIDs = append(organizersIDs, zUser.ID)
	for _, authOrg := range authOrgas {
		if authOrg.Banned {
			return nil, fmt.Errorf("user %s is banned", authOrg.Email)
		}
		zOrg, err := s.EnsureUserExists(ctx, authOrg)
		if err != nil {
			return nil, err
		}
		if slices.Contains(organizersIDs, zOrg.ID) {
			return nil, fmt.Errorf("duplicate organizer: %s", authOrg.Email)
		}
		organizersIDs = append(organizersIDs, zOrg.ID)
	}

	authGkps, err := s.Auth.EnsureUsersExists(ctx, req.Msg.Gatekeepers)
	if err != nil {
		return nil, err
	}

	var gatekeepersIDs []string
	for _, authGkp := range authGkps {
		if authGkp.Banned {
			return nil, fmt.Errorf("user %s is banned", authGkp.Email)
		}
		zGkp, err := s.EnsureUserExists(ctx, authGkp)
		if err != nil {
			return nil, err
		}
		if slices.Contains(gatekeepersIDs, zGkp.ID) {
			return nil, fmt.Errorf("duplicate gatekeeper: %s", authGkp.Email)
		}
		gatekeepersIDs = append(gatekeepersIDs, zGkp.ID)
	}

	if err := validateEvent(req.Msg.StartDate, req.Msg.EndDate, req.Msg.Title, req.Msg.Description, req.Msg.Location, req.Msg.ImageUri, req.Msg.Capacity, req.Msg.TicketPrice, req.Msg.Password); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	var (
		targets      []*zeni.User
		participants []*zeni.User
		targetIDs    = make(map[string]bool)
		cmt          *zeni.Community
		newCmt       *zeni.Community
		evt          *zeni.Event
	)
	if err := s.DB.TxWithSpan(ctx, "db.EditEvent", func(db zeni.DB) error {
		roles, err := db.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleOrganizer) {
			return errors.New("user is not organizer of the event")
		}

		if cmt, err = db.GetEventCommunity(req.Msg.EventId); err != nil {
			return err
		}

		if cmt != nil && cmt.ID != req.Msg.CommunityId {
			if err = db.RemoveEventFromCommunity(req.Msg.EventId, cmt.ID); err != nil {
				return err
			}
		}

		if req.Msg.CommunityId != "" && (cmt == nil || req.Msg.CommunityId != cmt.ID) {
			newCmt, err = db.GetCommunity(req.Msg.CommunityId)
			if err != nil {
				return err
			}
			entityRoles, err := db.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeCommunity, req.Msg.CommunityId)
			if err != nil {
				return err
			}
			if !slices.Contains(entityRoles, zeni.RoleAdministrator) {
				return errors.New("user is not administrator of the community")
			}
			if err = db.AddEventToCommunity(req.Msg.EventId, req.Msg.CommunityId); err != nil {
				return err
			}
			targets, err = db.GetOrgUsersWithRole(zeni.EntityTypeCommunity, req.Msg.CommunityId, zeni.RoleMember)
			if err != nil {
				return err
			}
			participants, err = db.GetOrgUsersWithRole(zeni.EntityTypeEvent, req.Msg.EventId, zeni.RoleParticipant)
			if err != nil {
				return err
			}

			for _, target := range targets {
				targetIDs[target.ID] = true
			}

			for _, participant := range participants {
				if !targetIDs[participant.ID] {
					if err := db.AddMemberToCommunity(req.Msg.CommunityId, participant.ID); err != nil {
						return err
					}
				}
			}
		}

		if evt, err = db.EditEvent(req.Msg.EventId, organizersIDs, gatekeepersIDs, req.Msg); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	if newCmt != nil && time.Now().Add(24*time.Hour).Before(evt.StartDate) && s.MailClient != nil {
		participantsIDS := make(map[string]bool)
		for _, participant := range participants {
			participantsIDS[participant.ID] = true
		}

		var authIDs []string
		for _, target := range targets {
			if !participantsIDS[target.ID] {
				authIDs = append(authIDs, target.AuthID)
			}
		}
		authTargets, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
		if err != nil {
			return nil, err
		}

		htmlStr, text, err := communityNewEventMailContent(evt, newCmt)
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

	privacy, err := zeni.EventPrivacyFromPasswordHash(evt.PasswordHash)
	if err != nil {
		return nil, err
	}

	if err := s.Chain.WithContext(ctx).EditEvent(req.Msg.EventId, zUser.ID, organizersIDs, gatekeepersIDs, req.Msg, privacy); err != nil {
		return nil, err
	}

	if cmt != nil && cmt.ID != req.Msg.CommunityId {
		if err := s.Chain.WithContext(ctx).RemoveEventFromCommunity(cmt.CreatorID, cmt.ID, req.Msg.EventId); err != nil {
			return nil, err
		}
	}

	if newCmt != nil {
		if err := s.Chain.WithContext(ctx).AddEventToCommunity(zUser.ID, newCmt.ID, req.Msg.EventId); err != nil {
			return nil, err
		}

		for _, participant := range participants {
			if !targetIDs[participant.ID] {
				if err := s.Chain.WithContext(ctx).AddMemberToCommunity(newCmt.CreatorID, req.Msg.CommunityId, participant.ID); err != nil {
					s.Logger.Error("add-event-to-community-chain", zap.Error(err), zap.String("community-id", req.Msg.CommunityId), zap.String("participant-id", participant.ID))
					return nil, err
				}
			}
		}
	}

	return connect.NewResponse(&zenaov1.EditEventResponse{
		Id: req.Msg.EventId,
	}), nil
}
