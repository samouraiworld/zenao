package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) UsersWithRoles(ctx context.Context, req *connect.Request[zenaov1.UsersWithRolesRequest]) (*connect.Response[zenaov1.UsersWithRolesResponse], error) {
	if req.Msg.Org == nil || req.Msg.Org.EntityId == "" || req.Msg.Org.EntityType == "" {
		return nil, errors.New("org entity type and id are required")
	}

	if len(req.Msg.Roles) == 0 {
		return nil, errors.New("roles array is required with at least one element")
	}

	var (
		users []*zeni.User
		res   []*zenaov1.UserWithRoles
	)
	// TODO: Optimize to include the roles within the return of GetOrgUsersWithRoles ?
	if err := s.DB.TxWithSpan(ctx, "UsersWithRole", func(tx zeni.DB) error {
		var err error
		users, err = tx.GetOrgUsersWithRoles(req.Msg.Org.EntityType, req.Msg.Org.EntityId, req.Msg.Roles)
		if err != nil {
			return err
		}
		for _, u := range users {
			roles, err := tx.EntityRoles(zeni.EntityTypeUser, u.ID, req.Msg.Org.EntityType, req.Msg.Org.EntityId)
			if err != nil {
				return err
			}
			userWithRoles := &zenaov1.UserWithRoles{
				RealmId: s.Chain.UserRealmID(u.ID), // TODO: adapt front-end to expect ID instead of addresses ?
				Roles:   roles,
			}
			res = append(res, userWithRoles)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.UsersWithRolesResponse{UsersWithRoles: res}), nil
}
