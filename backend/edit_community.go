package main

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"slices"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) EditCommunity(ctx context.Context, req *connect.Request[zenaov1.EditCommunityRequest]) (*connect.Response[zenaov1.EditCommunityResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("edit-community", zap.String("community-id", req.Msg.CommunityId), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := validateCommunity(req.Msg.DisplayName, req.Msg.Description, req.Msg.AvatarUri, req.Msg.BannerUri); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	authAdmins, err := s.Auth.EnsureUsersExists(ctx, req.Msg.Administrators)
	if err != nil {
		return nil, err
	}

	var adminIDs []string
	adminIDs = append(adminIDs, zUser.ID)
	for _, authAdmin := range authAdmins {
		if authAdmin.Banned {
			return nil, fmt.Errorf("user %s is banned", authAdmin.Email)
		}
		zAdmin, err := s.EnsureUserExists(ctx, authAdmin)
		if err != nil {
			return nil, err
		}
		if slices.Contains(adminIDs, zAdmin.ID) {
			continue
		}
		adminIDs = append(adminIDs, zAdmin.ID)
	}

	if err := s.DB.TxWithSpan(ctx, "db.EditCommunity", func(tx zeni.DB) error {
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeCommunity, req.Msg.CommunityId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleAdministrator) {
			return errors.New("you must be an administrator of the community to edit it")
		}
		_, err = tx.EditCommunity(req.Msg.CommunityId, adminIDs, req.Msg)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EditCommunityResponse{}), nil
}

func validateCommunity(name, description, avatarURI, bannerURI string) error {
	if len(name) < 2 || len(name) > 140 {
		return errors.New("community name must be length 2 to 140")
	}
	if len(description) < 10 || len(description) > 10000 {
		return errors.New("community description must be length 10 to 10000")
	}

	if len(avatarURI) == 0 || len(avatarURI) > 400 {
		return errors.New("avatar URI must be length 1 to 400")
	}
	// NOTE: url package supports uri parsing
	if _, err := url.Parse(avatarURI); err != nil {
		return fmt.Errorf("invalid avatar URI: %w", err)
	}
	if len(bannerURI) > 400 {
		return errors.New("banner URI must be length lte 400")
	}
	if len(bannerURI) > 0 {
		if _, err := url.Parse(bannerURI); err != nil {
			return fmt.Errorf("invalid banner URI: %w", err)
		}
	}
	return nil
}
