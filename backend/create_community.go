package main

import (
	"context"
	"errors"
	"fmt"
	"slices"
	_ "time/tzdata"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreateCommunity(
	ctx context.Context,
	req *connect.Request[zenaov1.CreateCommunityRequest],
) (*connect.Response[zenaov1.CreateCommunityResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("create-community", zap.String("name", req.Msg.DisplayName), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

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

	cmt := (*zeni.Community)(nil)
	if err := s.DB.TxWithSpan(ctx, "db.CreateCommunity", func(tx zeni.DB) error {
		var err error
		cmt, err = tx.CreateCommunity(zUser.ID, adminIDs, []string{}, []string{}, req.Msg)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreateCommunityResponse{CommunityId: cmt.ID}), nil
}
