package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) GetPoll(ctx context.Context, req *connect.Request[zenaov1.GetPollRequest]) (*connect.Response[zenaov1.GetPollResponse], error) {
	if req.Msg.PollId == "" {
		return nil, errors.New("poll ID is required")
	}

	actor, err := s.GetOptionalActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	var (
		zPoll *zeni.Poll
		zPost *zeni.Post
	)

	actorID := ""
	if actor != nil {
		actorID = actor.ID()
	}
	if err = s.DB.TxWithSpan(ctx, "GetPoll", func(tx zeni.DB) error {
		zPoll, err = tx.GetPollByID(req.Msg.PollId, actorID)
		if err != nil {
			return err
		}
		zPost, err = tx.GetPostByID(zPoll.PostID)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	poll := &pollsv1.Poll{
		Question:  zPoll.Question,
		Results:   zPoll.Results,
		Kind:      zPoll.Kind,
		Duration:  zPoll.Duration,
		CreatedAt: zPoll.CreatedAt.Unix(),
		CreatedBy: zPost.UserID,
	}

	return connect.NewResponse(&zenaov1.GetPollResponse{Poll: poll}), nil
}
