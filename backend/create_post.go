package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreatePost(ctx context.Context, req *connect.Request[zenaov1.CreatePostRequest]) (*connect.Response[zenaov1.CreatePostResponse], error) {
	user := s.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("create-standard-post", zap.String("event-id", req.Msg.EventId), zap.String("content", req.Msg.Content), zap.String("user-id", string(userID)), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	//XXX: do more verification ?
	if len(req.Msg.Content) == 0 {
		return nil, errors.New("content of standard post cannot be empty")
	}

	if err := s.DB.Tx(func(db zeni.DB) error {
		roles, err := db.UserRoles(userID, req.Msg.EventId)
		if err != nil {
			return err
		}
		if len(roles) == 0 {
			return errors.New("user is not a member of the event")
		}

		// XXX: Create on Chain Post

		// XXX: Create in DB
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreatePostResponse{PostId: "1"}), nil
}
