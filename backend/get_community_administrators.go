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
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-community-administrators", zap.String("community-id", req.Msg.CommunityId), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	var admins []*zeni.User
	if err := s.DB.TxWithSpan(ctx, "db.GetCommunityAdministrators", func(db zeni.DB) error {
		roles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeCommunity, req.Msg.CommunityId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleAdministrator) {
			return errors.New("user is not administrator of the community")
		}
		admins, err = db.GetOrgUsersWithRoles(zeni.EntityTypeCommunity, req.Msg.CommunityId, []string{zeni.RoleAdministrator})
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
