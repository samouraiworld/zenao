package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) EntitiesWithRole(ctx context.Context, req *connect.Request[zenaov1.EntitiesWithRoleRequest]) (*connect.Response[zenaov1.EntitiesWithRoleResponse], error) {
	if req.Msg.Org == nil || req.Msg.Org.EntityId == "" || req.Msg.Org.EntityType == "" {
		return nil, errors.New("org entity type and id are required")
	}

	if req.Msg.Role == "" {
		return nil, errors.New("role is required")
	}

	return nil, errors.New("not implemented")
}
