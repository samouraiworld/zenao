package main

import (
	"context"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

// CancelParticipation implements zenaov1connect.ZenaoServiceHandler
func (s *ZenaoServer) CancelParticipation(ctx context.Context, req *connect.Request[zenaov1.CancelParticipationRequest]) (*connect.Response[zenaov1.CancelParticipationResponse], error) {
	return connect.NewResponse(&zenaov1.CancelParticipationResponse{}), nil
}
