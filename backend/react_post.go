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
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("react-post", zap.String("post-id", req.Msg.PostId), zap.String("icon", req.Msg.Icon), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	if len(req.Msg.Icon) == 0 {
		return nil, errors.New("icon cannot be empty")
	}

	var orgType, orgID string
	if err := s.DB.TxWithSpan(ctx, "db.ReactPost", func(db zeni.DB) error {
		orgType, orgID, err = db.GetOrgByPostID(req.Msg.PostId)
		if err != nil {
			return err
		}
		roles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), orgType, orgID)
		if err != nil {
			return err
		}
		if len(roles) == 0 {
			return errors.New("user is not a member of the event")
		}

		if err = db.ReactPost(actor.ID(), req.Msg); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.ReactPostResponse{}), nil
}
