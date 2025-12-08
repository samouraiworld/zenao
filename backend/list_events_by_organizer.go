package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func (s *ZenaoServer) ListEventsByOrganizer(ctx context.Context, req *connect.Request[zenaov1.ListEventsByOrganizerRequest]) (*connect.Response[zenaov1.EventsInfo], error) {
	return nil, errors.New("not implemented")
}
