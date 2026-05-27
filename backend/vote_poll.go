package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) VotePoll(ctx context.Context, req *connect.Request[zenaov1.VotePollRequest]) (*connect.Response[zenaov1.VotePollResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("vote-poll", zap.String("poll-id", req.Msg.PollId), zap.String("option", req.Msg.Option), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	if err := s.DB.TxWithSpan(ctx, "db.VotePoll", func(db zeni.DB) error {
		orgType, orgID, err := db.GetOrgByPollID(req.Msg.PollId)
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
		if err = db.VotePoll(actor.ID(), req.Msg); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.VotePollResponse{}), nil
}
