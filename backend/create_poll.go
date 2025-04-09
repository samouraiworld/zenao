package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"connectrpc.com/connect"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreatePoll(ctx context.Context, req *connect.Request[zenaov1.CreatePollRequest]) (*connect.Response[zenaov1.CreatePollResponse], error) {
	user := s.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	userID, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("create-poll", zap.String("question", req.Msg.Question), zap.Strings("options", req.Msg.Options), zap.String("user-id", string(userID)), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := validatePoll(req.Msg); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	//XXX: if saving post to db, use a gorm Tx
	roles, err := s.DB.UserRoles(userID, req.Msg.EventId)
	if err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return nil, errors.New("user is not a member of the event")
	}

	if err := s.Chain.CreatePoll(userID, req.Msg); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreatePollResponse{}), nil

}

func validatePoll(req *zenaov1.CreatePollRequest) error {
	if len(req.Options) < 2 {
		return errors.New("poll must have at least 2 options")
	}
	if len(req.Options) > 8 {
		return errors.New("poll must have at most 8 options")
	}
	minDuration := int64(time.Minute) * 15 / int64(time.Second)
	maxDuration := int64(time.Hour) * 24 * 30 / int64(time.Second)
	if req.Duration < minDuration {
		return errors.New("duration must be at least 15 minutes")
	}
	if req.Duration > maxDuration {
		return errors.New("duration must be at most 1 month")
	}
	if req.Kind == pollsv1.PollKind_POLL_KIND_UNSPECIFIED {
		return errors.New("poll cannot have an unspecified kind")
	}
	return nil
}
