package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) GetUserTeams(
	ctx context.Context,
	req *connect.Request[zenaov1.GetUserTeamsRequest],
) (*connect.Response[zenaov1.GetUserTeamsResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	teams, err := s.DB.GetUserTeams(zUser.ID)
	if err != nil {
		return nil, err
	}

	var pbTeams []*zenaov1.UserTeam
	for _, t := range teams {
		pbTeams = append(pbTeams, &zenaov1.UserTeam{
			TeamId:      t.Team.ID,
			DisplayName: t.Team.DisplayName,
			Bio:         t.Team.Bio,
			AvatarUri:   t.Team.AvatarURI,
			Role:        t.Role,
			Plan:        t.Team.Plan.String(),
		})
	}

	return connect.NewResponse(&zenaov1.GetUserTeamsResponse{Teams: pbTeams}), nil
}
