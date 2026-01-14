package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) EntityRoles(ctx context.Context, req *connect.Request[zenaov1.EntityRolesRequest]) (*connect.Response[zenaov1.EntityRolesResponse], error) {
	if req.Msg.Entity == nil || req.Msg.Entity.EntityType == "" || req.Msg.Entity.EntityId == "" {
		return nil, errors.New("entity type and id are required")
	}

	if req.Msg.Org == nil || req.Msg.Org.EntityId == "" || req.Msg.Org.EntityType == "" {
		return nil, errors.New("org entity type and id are required")
	}

	var roles []string
	if err := s.DB.TxWithSpan(ctx, "EntityRoles", func(tx zeni.DB) error {
		var err error
		roles, err = tx.EntityRoles(req.Msg.Entity.EntityType, req.Msg.Entity.EntityId, req.Msg.Org.EntityType, req.Msg.Org.EntityId)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EntityRolesResponse{Roles: roles}), nil
}
