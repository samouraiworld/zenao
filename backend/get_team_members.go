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

func (s *ZenaoServer) GetTeamMembers(ctx context.Context, req *connect.Request[zenaov1.GetTeamMembersRequest]) (*connect.Response[zenaov1.GetTeamMembersResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-team-members", zap.String("team-id", req.Msg.TeamId), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	type userWithRole struct {
		user *zeni.User
		role string
	}
	var usersWithRoles []userWithRole

	if err := s.DB.TxWithSpan(ctx, "db.GetTeamMembers", func(db zeni.DB) error {
		roles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeTeam, req.Msg.TeamId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleTeamOwner) && !slices.Contains(roles, zeni.RoleTeamMember) {
			return errors.New("user is not a member of the team")
		}

		owners, err := db.GetOrgUsersWithRoles(zeni.EntityTypeTeam, req.Msg.TeamId, []string{zeni.RoleTeamOwner})
		if err != nil {
			return err
		}
		for _, owner := range owners {
			if owner.AuthID == "" {
				return errors.New("team member missing auth ID")
			}
			usersWithRoles = append(usersWithRoles, userWithRole{user: owner, role: zeni.RoleTeamOwner})
		}

		members, err := db.GetOrgUsersWithRoles(zeni.EntityTypeTeam, req.Msg.TeamId, []string{zeni.RoleTeamMember})
		if err != nil {
			return err
		}
		for _, member := range members {
			if member.AuthID == "" {
				return errors.New("team member missing auth ID")
			}
			usersWithRoles = append(usersWithRoles, userWithRole{user: member, role: zeni.RoleTeamMember})
		}

		return nil
	}); err != nil {
		return nil, err
	}

	var authIDs []string
	for _, uwr := range usersWithRoles {
		authIDs = append(authIDs, uwr.user.AuthID)
	}

	authUsers, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
	if err != nil {
		return nil, err
	}

	authIDToEmail := make(map[string]string)
	for _, authUser := range authUsers {
		authIDToEmail[authUser.ID] = authUser.Email
	}

	var members []*zenaov1.TeamMember
	for _, uwr := range usersWithRoles {
		email, ok := authIDToEmail[uwr.user.AuthID]
		if !ok {
			return nil, errors.New("failed to get email for team member")
		}
		members = append(members, &zenaov1.TeamMember{
			UserId:      uwr.user.ID,
			DisplayName: uwr.user.DisplayName,
			AvatarUri:   uwr.user.AvatarURI,
			Email:       email,
			Role:        uwr.role,
		})
	}

	return connect.NewResponse(&zenaov1.GetTeamMembersResponse{Members: members}), nil
}
