package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"connectrpc.com/connect"
	ma "github.com/multiformats/go-multiaddr"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
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

	if err := validatePoll(req.Msg.Question, req.Msg.Options /*req.Msg.Kind,*/, req.Msg.Duration); err != nil {
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

	zpost := (*zeni.Post)(nil)
	if err := s.DB.Tx(func(db zeni.DB) error {
		pollID, postID, err := s.Chain.CreatePoll(userID, req.Msg)
		if err != nil {
			return err
		}

		postURI, err := ma.NewMultiaddr(fmt.Sprintf("/poll/%s/gno.land/r/zenao/polls", pollID))
		if err != nil {
			return err
		}

		post := &feedsv1.Post{
			Post: &feedsv1.Post_Link{
				Link: &feedsv1.LinkPost{
					Uri: postURI.String(),
				},
			},
		}

		feed, err := db.GetFeed(req.Msg.EventId, "main")
		if err != nil {
			return err
		}

		if zpost, err = db.CreatePost(postID, feed.ID, userID, post); err != nil {
			return err
		}

		if _, err := db.CreatePoll(pollID, postID, req.Msg); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreatePollResponse{PostId: zpost.ID}), nil

}

func validatePoll(question string, options []string, duration int64) error {
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
	// XXX: need gno proto to handle import
	// if kind == pollsv1.PollKind_POLL_KIND_UNSPECIFIED {
	// 	return errors.New("poll cannot have an unspecified kind")
	// }
	return nil
}
