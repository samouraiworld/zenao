package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"connectrpc.com/connect"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

// TODO: CLEAN COMMENT
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

	roles, err := s.DB.WithContext(ctx).EntityRoles(zeni.EntityTypeUser, zUser.ID, req.Msg.OrgType, req.Msg.OrgId)
	if err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return nil, errors.New("user is not a member of the organization that owns the feed")
	}
	// pollID, postID, err := s.Chain.WithContext(ctx).CreatePoll(zUser.ID, req.Msg)
	// if err != nil {
	// 	return nil, err
	// }

	// postURI, err := ma.NewMultiaddr(fmt.Sprintf("/poll/%s/gno/gno.land/r/zenao/polls", pollID))
	// if err != nil {
	// 	return nil, err
	// }

	post := &feedsv1.Post{
		Post: &feedsv1.Post_Link{
			Link: &feedsv1.LinkPost{
				// TODO: WHAT WE DO HERE ?
				// Uri: postURI.String(),
			},
		},
	}

	zpoll := (*zeni.Poll)(nil)
	if err := s.DB.TxWithSpan(ctx, "db.CreatePoll", func(db zeni.DB) error {
		feed, err := db.GetFeed(req.Msg.OrgType, req.Msg.OrgId, "main")
		if err != nil {
			return err
		}

		// TODO: FIX THIS
		if zpoll, err = db.CreatePoll(zUser.ID, pollID, postID, feed.ID, post, req.Msg); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreatePollResponse{PostId: zpoll.PostID}), nil

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
