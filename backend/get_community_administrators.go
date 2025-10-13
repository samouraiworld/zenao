package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) GetCommunityAdministrators(ctx context.Context, req *connect.Request[zenaov1.GetCommunityAdministratorsRequest]) (*connect.Response[zenaov1.GetCommunityAdministratorsResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-community-administrators", zap.String("community-id", req.Msg.CommunityId), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	administrators, err := s.Chain.WithContext(ctx).GetCommunityUsersByRole(req.Msg.CommunityId, zeni.RoleAdministrator)
	if err != nil {
		return nil, err
	}

	var admIDs []string
	for _, admin := range administrators {
		// TODO: actually in future an event could be admin of communities
		id, err := s.Chain.WithContext(ctx).FromRealmIDToID(admin, "u")
		if err != nil {
			return nil, err
		}
		admIDs = append(admIDs, id)
	}

	admins, err := s.DB.GetUsersFromIDs(admIDs)
	if err != nil {
		return nil, err
	}

	adminsAuthIDs := mapsl.Map(admins, func(u *zeni.User) string {
		return u.AuthID
	})

	users, err := s.Auth.GetUsersFromIDs(ctx, adminsAuthIDs)
	if err != nil {
		return nil, err
	}

	adminsEmails := mapsl.Map(users, func(u *zeni.AuthUser) string {
		return u.Email
	})

	return connect.NewResponse(&zenaov1.GetCommunityAdministratorsResponse{Administrators: adminsEmails}), nil
}
