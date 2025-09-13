package main

import (
	"context"
	"errors"
	"slices"

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

	var admins []*zeni.User
	if err := s.DB.WithContext(ctx).Tx(func(db zeni.DB) error {
		roles, err := db.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeCommunity, req.Msg.CommunityId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleAdministrator) {
			return errors.New("user is not administrator of the community")
		}
		admins, err = db.GetOrgUsersWithRole(zeni.EntityTypeCommunity, req.Msg.CommunityId, zeni.RoleAdministrator)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	admIDs := mapsl.Map(admins, func(adm *zeni.User) string {
		return adm.AuthID
	})

	users, err := s.Auth.GetUsersFromIDs(ctx, admIDs)
	if err != nil {
		return nil, err
	}

	adminsEmails := mapsl.Map(users, func(u *zeni.AuthUser) string {
		return u.Email
	})

	return connect.NewResponse(&zenaov1.GetCommunityAdministratorsResponse{Administrators: adminsEmails}), nil
}
