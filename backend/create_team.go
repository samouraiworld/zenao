package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreateTeam(
	ctx context.Context,
	req *connect.Request[zenaov1.CreateTeamRequest],
) (*connect.Response[zenaov1.CreateTeamResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("create-team", zap.String("name", req.Msg.DisplayName), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	// Teams cannot create teams
	teamID := req.Header().Get("X-Team-Id")
	if teamID != "" {
		return nil, errors.New("teams cannot create other teams")
	}

	if len(req.Msg.DisplayName) < 3 || len(req.Msg.DisplayName) > 50 {
		return nil, errors.New("display name must be between 3 and 50 characters")
	}

	team := (*zeni.User)(nil)
	if err := s.DB.TxWithSpan(ctx, "db.CreateTeam", func(tx zeni.DB) error {
		var err error
		team, err = tx.CreateTeam(zUser.ID, req.Msg.DisplayName)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreateTeamResponse{TeamId: team.ID}), nil
}
