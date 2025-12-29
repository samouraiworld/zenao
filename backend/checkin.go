package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

// Participate implements zenaov1connect.ZenaoServiceHandler.
func (s *ZenaoServer) Checkin(ctx context.Context, req *connect.Request[zenaov1.CheckinRequest]) (*connect.Response[zenaov1.CheckinResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("checkin", zap.String("gatekeeper", zUser.ID), zap.String("pubkey", req.Msg.TicketPubkey))
	if err := s.DB.TxWithSpan(ctx, "db.Checkin", func(db zeni.DB) error {
		_, err = db.Checkin(req.Msg.TicketPubkey, zUser.ID, req.Msg.Signature)
		return err
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CheckinResponse{}), nil
}
