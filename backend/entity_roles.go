package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) EntityRoles(ctx context.Context, req *connect.Request[zenaov1.EntityRolesRequest]) (*connect.Response[zenaov1.EntityRolesResponse], error) {
	return nil, errors.New("not implemented")
}
