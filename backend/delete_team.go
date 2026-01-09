package main

import (
	"context"
	"errors"
	"slices"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) DeleteTeam(
	ctx context.Context,
	req *connect.Request[zenaov1.DeleteTeamRequest],
) (*connect.Response[zenaov1.DeleteTeamResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("delete-team", zap.String("team-id", req.Msg.TeamId), zap.String("user-id", zUser.ID))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := s.DB.TxWithSpan(ctx, "db.DeleteTeam", func(tx zeni.DB) error {
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeTeam, req.Msg.TeamId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleTeamOwner) {
			return errors.New("only team owners can delete team")
		}
		team, err := tx.GetUserByID(req.Msg.TeamId)
		if err != nil {
			return errors.New("team not found")
		}
		if !team.IsTeam {
			return errors.New("specified ID is not a team")
		}

		return tx.DeleteTeam(req.Msg.TeamId)
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.DeleteTeamResponse{}), nil
}
