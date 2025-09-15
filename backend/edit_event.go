package main

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"connectrpc.com/connect"
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

	var evt *zeni.Event
	// NOTE: For now we does not want to handle multiple communities per event
	var cmt *zeni.Community
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
		}

		if evt, err = db.EditEvent(req.Msg.EventId, organizersIDs, gatekeepersIDs, req.Msg); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	privacy, err := zeni.EventPrivacyFromPasswordHash(evt.PasswordHash)
	if err != nil {
		return nil, err
	}

	if err := s.Chain.WithContext(ctx).EditEvent(req.Msg.EventId, zUser.ID, organizersIDs, gatekeepersIDs, req.Msg, privacy); err != nil {
		return nil, err
	}

	if cmt != nil && cmt.ID != req.Msg.CommunityId {
		if err := s.Chain.WithContext(ctx).RemoveEventFromCommunity(cmt.CreatorID, req.Msg.EventId, cmt.ID); err != nil {
			return nil, err
		}
	}

	if req.Msg.CommunityId != "" && (cmt == nil || req.Msg.CommunityId != cmt.ID) {
		if err := s.Chain.WithContext(ctx).AddEventToCommunity(zUser.ID, req.Msg.EventId, req.Msg.CommunityId); err != nil {
			return nil, err
		}
	}

	s.Logger.Info("event-edited", zap.String("event-id", evt.ID), zap.String("title", evt.Title))

	return connect.NewResponse(&zenaov1.EditEventResponse{
		Id: req.Msg.EventId,
	}), nil
}
