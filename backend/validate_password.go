package main

import (
	"context"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

// XXX: rate limit to avoid bruteforce weak passwords
func (s *ZenaoServer) ValidatePassword(ctx context.Context, req *connect.Request[zenaov1.ValidatePasswordRequest]) (*connect.Response[zenaov1.ValidatePasswordResponse], error) {
	valid, err := s.Chain.WithContext(ctx).ValidatePassword(req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&zenaov1.ValidatePasswordResponse{Valid: valid}), nil
}
