package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) EntitiesWithRole(ctx context.Context, req *connect.Request[zenaov1.EntitiesWithRoleRequest]) (*connect.Response[zenaov1.EntitiesWithRoleResponse], error) {
	return nil, errors.New("not implemented")
}
