package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) ReactPost(ctx context.Context, req *connect.Request[zenaov1.ReactPostRequest]) (*connect.Response[zenaov1.ReactPostResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("react-post", zap.String("post-id", req.Msg.PostId), zap.String("icon", req.Msg.Icon), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if len(req.Msg.Icon) == 0 {
		return nil, errors.New("icon cannot be empty")
	}

	evt := (*zeni.Event)(nil)
	if err := s.DB.Tx(func(db zeni.DB) error {
		evt, err = db.GetEventByPostID(req.Msg.PostId)
		if err != nil {
			return err
		}
		roles, err := db.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeEvent, evt.ID)
		if err != nil {
			return err
		}
		if len(roles) == 0 {
			return errors.New("user is not a member of the event")
		}

		if err = db.ReactPost(zUser.ID, req.Msg); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	if err = s.Chain.ReactPost(zUser.ID, evt.ID, req.Msg); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.ReactPostResponse{}), nil
}
