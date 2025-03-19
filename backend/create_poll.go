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

	if err := validatePoll(req.Msg.Question, req.Msg.Options, req.Msg.Kind, req.Msg.Duration); err != nil {
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

	return connect.NewResponse(&zenaov1.CreatePollResponse{
		Id: "1",
	}), nil

}

func validatePoll(question string, options []string, kind pollsv1.PollKind, duration int64) error {
	if len(options) < 2 {
		return errors.New("poll must have at least 2 options")
	}
	if len(options) > 8 {
		return errors.New("poll must have at most 8 options")
	}
	if duration < int64(time.Minute)*15 {
		return errors.New("duration must be at least 15 minutes")
	}
	if duration > int64(time.Hour)*24*30 {
		return errors.New("duration must be at most 1 month")
	}
	if kind == pollsv1.PollKind_POLL_KIND_UNSPECIFIED {
		return errors.New("poll cannot have an unspecified kind")
	}
	return nil
}
