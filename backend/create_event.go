package main

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreateEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.CreateEventRequest],
) (*connect.Response[zenaov1.CreateEventResponse], error) {
	user := s.GetUser(ctx)

	// retrieve auto-incremented user ID from database, do not use clerk's user ID directly for realms
	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	//TODO delete just for test
	s.EditUser(ctx, &connect.Request[zenaov1.EditUserRequest]{
		Msg: &zenaov1.EditUserRequest{
			DisplayName: "Killua",
			Bio:         "I'm a pro hunter",
			AvatarUri:   "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExaDh0bGdycmUyNG1jNXdtOHp5ejBlOXZ2Yml2bnYxOXRpN3oxZmlnMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/HGQ4RWHYtw9Dmhj7mk/giphy.gif",
		},
	})

	s.Logger.Info("create-event", zap.String("title", req.Msg.Title), zap.String("user-id", string(userID)), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if req.Msg.TicketPrice != 0 {
		return nil, errors.New("event with price is not supported")
	}

	// TODO: validate request

	evtID := ""

	if err := s.DBTx(func(db ZenaoDB) error {
		var err error
		if evtID, err = db.CreateEvent(userID, req.Msg); err != nil {
			return err
		}

		if err := s.Chain.CreateEvent(fmt.Sprintf("%d", evtID), fmt.Sprintf("%d", userID), req.Msg); err != nil {
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
