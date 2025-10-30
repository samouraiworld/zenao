package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"connectrpc.com/connect"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreatePoll(ctx context.Context, req *connect.Request[zenaov1.CreatePollRequest]) (*connect.Response[zenaov1.CreatePollResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("create-poll", zap.String("question", req.Msg.Question), zap.Strings("options", req.Msg.Options), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := validatePoll(req.Msg); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	userRealmID := s.Chain.UserRealmID(zUser.ID)
	entityRealmID, err := s.Chain.WithContext(ctx).EntityRealmID(req.Msg.OrgType, req.Msg.OrgId)
	if err != nil {
		return nil, fmt.Errorf("invalid org: %w", err)
	}
	_, postID, err := s.Chain.WithContext(ctx).CreatePoll(userRealmID, entityRealmID, req.Msg)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreatePollResponse{PostId: postID}), nil

}

func validatePoll(req *zenaov1.CreatePollRequest) error {
	if req.OrgType != zeni.EntityTypeEvent && req.OrgType != zeni.EntityTypeCommunity {
		return errors.New("invalid org type (only event or community allowed)")
	}
	if len(req.Options) < 2 {
		return errors.New("poll must have at least 2 options")
	}
	if len(req.Options) > 8 {
		return errors.New("poll must have at most 8 options")
	}
	seen := make(map[string]bool)
	for _, option := range req.Options {
		if option == "" {
			return errors.New("option cannot be empty")
		}
		if len(option) > 128 {
			return errors.New("option cannot be longer than 128 characters")
		}
		if seen[option] {
			return errors.New("duplicate option")
		}
		seen[option] = true
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
