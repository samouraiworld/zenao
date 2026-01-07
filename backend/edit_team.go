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

func (s *ZenaoServer) EditTeam(
	ctx context.Context,
	req *connect.Request[zenaov1.EditTeamRequest],
) (*connect.Response[zenaov1.EditTeamResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("edit-team", zap.String("team-id", req.Msg.TeamId), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := validateProfile(req.Msg.DisplayName); err != nil {
		return nil, err
	}

	authMembers, err := s.Auth.EnsureUsersExists(ctx, req.Msg.Members)
	if err != nil {
		return nil, err
	}

	var memberIDs []string
	for _, authMember := range authMembers {
		if authMember.Banned {
			return nil, fmt.Errorf("user %s is banned", authMember.Email)
		}
		zMember, err := s.EnsureUserExists(ctx, authMember)
		if err != nil {
			return nil, err
		}
		if !slices.Contains(memberIDs, zMember.ID) {
			memberIDs = append(memberIDs, zMember.ID)
		}
	}

	if err := s.DB.TxWithSpan(ctx, "db.EditTeam", func(tx zeni.DB) error {
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeTeam, req.Msg.TeamId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleTeamOwner) {
			return errors.New("only team owners can edit team")
		}

		return tx.EditTeam(req.Msg.TeamId, memberIDs, req.Msg)
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EditTeamResponse{}), nil
}
