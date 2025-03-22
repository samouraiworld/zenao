package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) VotePoll(ctx context.Context, req *connect.Request[zenaov1.VotePollRequest]) (*connect.Response[zenaov1.VotePollResponse], error) {
	user := s.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("vote-poll", zap.String("poll-id", req.Msg.PollId), zap.String("option", req.Msg.Option))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	//TODO: add is member check once we add auth layer in poll realm
	//TODO: once polls are sync in db, ensure option & id exists

	if err := s.Chain.VotePoll(userID, req.Msg); err != nil {
		s.Logger.Error("vote-on-poll", zap.Error(err))
	}

	return connect.NewResponse(&zenaov1.VotePollResponse{}), nil
}
