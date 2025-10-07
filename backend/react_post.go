package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
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

	// var orgType, orgID string
	// if err := s.DB.TxWithSpan(ctx, "db.ReactPost", func(db zeni.DB) error {
	// 	orgType, orgID, err = db.GetOrgByPostID(req.Msg.PostId)
	// 	if err != nil {
	// 		return err
	// 	}
	// 	roles, err := db.EntityRoles(zeni.EntityTypeUser, zUser.ID, orgType, orgID)
	// 	if err != nil {
	// 		return err
	// 	}
	// 	if len(roles) == 0 {
	// 		return errors.New("user is not a member of the event")
	// 	}

	// 	if err = db.ReactPost(zUser.ID, req.Msg); err != nil {
	// 		return err
	// 	}

	// 	return nil
	// }); err != nil {
	// 	return nil, err
	// }

	// TODO:
	// 1. Remove the deleted code should be enough

	if err = s.Chain.WithContext(ctx).ReactPost(zUser.ID, req.Msg); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.ReactPostResponse{}), nil
}
