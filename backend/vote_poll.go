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
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("vote-poll", zap.String("poll-id", req.Msg.PollId), zap.String("option", req.Msg.Option), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := s.DB.Tx(func(db zeni.DB) error {
		evt, err := db.GetEventByPollID(req.Msg.PollId)
		if err != nil {
			return err
		}
		roles, err := db.UserRoles(zUser.ID, evt.ID)
		if err != nil {
			return err
		}
		if len(roles) == 0 {
			return errors.New("user is not a member of the event")
		}
		if err = db.VotePoll(zUser.ID, req.Msg); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	if err = s.Chain.VotePoll(zUser.ID, req.Msg); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.VotePollResponse{}), nil
}
