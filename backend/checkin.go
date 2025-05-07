package main

import (
	"context"
	"errors"
	"slices"

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

	var evt *zeni.Event

	if err := s.DB.Tx(func(db zeni.DB) error {
		_, evt, err = db.GetTicket(req.Msg.TicketPubkey)
		if err != nil {
			return err
		}
		roles, err := db.UserRoles(zUser.ID, evt.ID)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, "gatekeeper") {
			return errors.New("user is not gatekeeper for this event")
		}
		return nil
	}); err != nil {
		return nil, err
	}

	if evt == nil {
		return nil, errors.New("internal error: event is nil after db tx")
	}

	if err := s.Chain.Checkin(evt.ID, zUser.ID, req.Msg); err != nil {
		return nil, err
	}

	// XXX: mark checkin in db?

	return connect.NewResponse(&zenaov1.CheckinResponse{}), nil
}
