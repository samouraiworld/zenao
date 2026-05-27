package main

import (
	"context"
	"errors"
	"net/http"
	"slices"

	"github.com/samouraiworld/zenao/backend/zeni"
)

const TeamActorHeader = "X-Team-Id"

type Actor struct {
	User     *zeni.User
	ActingAs *zeni.User
	AuthUser *zeni.AuthUser
}

func (a *Actor) ID() string {
	if a.ActingAs != nil {
		return a.ActingAs.ID
	}
	return a.User.ID
}

func (a *Actor) IsTeam() bool {
	return a.ActingAs != nil
}

func (a *Actor) UserID() string {
	return a.User.ID
}

func (s *ZenaoServer) GetOptionalActor(ctx context.Context, header http.Header) (*Actor, error) {
	authUser := s.Auth.GetUser(ctx)
	if authUser == nil {
		return nil, nil
	}
	return s.buildActor(ctx, header, authUser)
}

func (s *ZenaoServer) GetActor(ctx context.Context, header http.Header) (*Actor, error) {
	authUser := s.Auth.GetUser(ctx)
	if authUser == nil {
		return nil, errors.New("unauthorized")
	}
	return s.buildActor(ctx, header, authUser)
}

func (s *ZenaoServer) buildActor(ctx context.Context, header http.Header, authUser *zeni.AuthUser) (*Actor, error) {
	if authUser.Banned {
		return nil, errors.New("user is banned")
	}

	zUser, err := s.EnsureUserExists(ctx, authUser)
	if err != nil {
		return nil, err
	}

	teamIDStr := header.Get(TeamActorHeader)
	if teamIDStr == "" {
		return &Actor{User: zUser, ActingAs: nil, AuthUser: authUser}, nil
	}

	actingAs, err := s.resolveTeamActor(ctx, zUser, teamIDStr)
	if err != nil {
		return nil, err
	}

	return &Actor{User: zUser, ActingAs: actingAs, AuthUser: authUser}, nil
}

func (s *ZenaoServer) resolveTeamActor(ctx context.Context, user *zeni.User, teamID string) (*zeni.User, error) {
	if user.IsTeam {
		return nil, errors.New("teams cannot act on behalf of other teams")
	}

	var team *zeni.User
	var roles []string

	if err := s.DB.TxWithSpan(ctx, "db.ResolveTeamActor", func(tx zeni.DB) error {
		var err error
		team, err = tx.GetUserByID(teamID)
		if err != nil {
			return errors.New("team not found")
		}
		if !team.IsTeam {
			return errors.New("specified ID is not a team")
		}
		roles, err = tx.EntityRoles(zeni.EntityTypeUser, user.ID, zeni.EntityTypeTeam, teamID)
		return err
	}); err != nil {
		return nil, err
	}

	if !slices.Contains(roles, zeni.RoleTeamOwner) {
		return nil, errors.New("user is not an owner of this team")
	}

	return team, nil
}
