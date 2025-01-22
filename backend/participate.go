package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

// Participate implements zenaov1connect.ZenaoServiceHandler.
func (s *ZenaoServer) Participate(ctx context.Context, req *connect.Request[zenaov1.ParticipateRequest]) (*connect.Response[zenaov1.ParticipateResponse], error) {
	user := s.GetUser(ctx)

	s.Logger.Info("participate", zap.String("event-id", req.Msg.EventId), zap.String("user-id", user.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := s.DBTx(func(db ZenaoDB) error {
		// XXX: can't create event with price for now but later we need to check that the event is free

		if err := db.Participate(req.Msg.EventId, user.ID); err != nil {
			return err
		}
		if err := s.Chain.Participate(req.Msg.EventId, user.ID); err != nil {
			// XXX: handle case where tx is broadcasted but we have an error afterwards, eg: chain has been updated but db rollbacked
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.ParticipateResponse{}), nil
}
