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
	if user == nil || user.Banned {
		return nil, errors.New("unauthorized")
	}

	s.Logger.Info("create-event", zap.String("title", req.Msg.Title), zap.String("user-id", user.ID), zap.Bool("user-banned", user.Banned))

	// TODO: validate request

	evtID := ""

	if err := s.DB.Tx(func(db ZenaoDB) error {
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
