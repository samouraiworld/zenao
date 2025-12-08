package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) UsersWithRole(ctx context.Context, req *connect.Request[zenaov1.UsersWithRoleRequest]) (*connect.Response[zenaov1.UsersWithRoleResponse], error) {
	if req.Msg.Org == nil || req.Msg.Org.EntityId == "" || req.Msg.Org.EntityType == "" {
		return nil, errors.New("org entity type and id are required")
	}

	if req.Msg.Role == "" {
		return nil, errors.New("role is required")
	}

	var users []*zeni.User
	if err := s.DB.TxWithSpan(ctx, "UsersWithRole", func(tx zeni.DB) error {
		var err error
		users, err = tx.GetOrgUsersWithRole(req.Msg.Org.EntityType, req.Msg.Org.EntityId, req.Msg.Role)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	usersIDs := mapsl.Map(users, func(u *zeni.User) string {
		return u.ID
	})

	return connect.NewResponse(&zenaov1.UsersWithRoleResponse{UsersIds: usersIDs}), nil
}
