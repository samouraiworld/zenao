package main

import (
	"context"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) Health(
	ctx context.Context,
	req *connect.Request[zenaov1.HealthRequest],
) (*connect.Response[zenaov1.HealthResponse], error) {
	return connect.NewResponse(&zenaov1.HealthResponse{
		Maintenance: s.Maintenance,
	}), nil
}
