package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreateEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.CreateEventRequest],
) (*connect.Response[zenaov1.CreateEventResponse], error) {
	user := s.GetUser(ctx)

	s.Logger.Info("create-event", zap.String("title", req.Msg.Title), zap.String("user-id", user.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	// TODO: validate request

	evtID := ""

	if err := s.DBTx(func(db ZenaoDB) error {
		var err error
		if evtID, err = db.CreateEvent(user.ID, req.Msg); err != nil {
			return err
		}

		if err := s.Chain.CreateEvent(evtID, user.ID, req.Msg); err != nil {
			s.Logger.Error("create-event", zap.Error(err))
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreateEventResponse{
		Id: evtID,
	}), nil
}
