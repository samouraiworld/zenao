package main

import (
	"context"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

// XXX: rate limit to avoid bruteforce weak passwords
func (s *ZenaoServer) ValidatePassword(ctx context.Context, req *connect.Request[zenaov1.ValidatePasswordRequest]) (*connect.Response[zenaov1.ValidatePasswordResponse], error) {
	evtRealmID := s.Chain.WithContext(ctx).EventRealmID(req.Msg.EventId)
	evt, err := s.Chain.WithContext(ctx).GetEvent(evtRealmID)
	if err != nil {
		return nil, err
	}
	valid := true
	if guarded := evt.Privacy.GetGuarded(); guarded != nil {
		var err error
		valid, err = zeni.ValidatePassword(req.Msg.Password, guarded.PasswordHash)
		if err != nil {
			return nil, err
		}
	}
	return connect.NewResponse(&zenaov1.ValidatePasswordResponse{Valid: valid}), nil
}
