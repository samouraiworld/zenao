package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) GetPost(ctx context.Context, req *connect.Request[zenaov1.GetPostRequest]) (*connect.Response[zenaov1.GetPostResponse], error) {
	if req.Msg.PostId == "" {
		return nil, errors.New("post ID is required")
	}

	actor, err := s.GetOptionalActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	var (
		zPost *zeni.Post
		count uint64
	)

	// TODO: check if children count works good
	if err = s.DB.TxWithSpan(ctx, "GetPost", func(tx zeni.DB) error {
		zPost, err = tx.GetPostByID(req.Msg.PostId)
		if err != nil {
			return err
		}
		count, err = tx.CountChildrenPosts(req.Msg.PostId)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	type rview struct {
		count        uint32
		userHasVoted bool
	}
	reactions := make(map[string]*rview)
	for _, reaction := range zPost.Reactions {
		rv, exists := reactions[reaction.Icon]
		if !exists {
			rv = &rview{}
		}
		rv.count++
		if actor != nil && reaction.UserID == actor.ID() {
			rv.userHasVoted = true
		}
		reactions[reaction.Icon] = rv
	}
	rviews := []*feedsv1.ReactionView{}
	for icon, rview := range reactions {
		rviews = append(rviews, &feedsv1.ReactionView{
			Icon:         icon,
			Count:        rview.count,
			UserHasVoted: rview.userHasVoted,
		})
	}

	info := &feedsv1.PostView{
		Post:          zPost.Post,
		ChildrenCount: uint64(count),
		Reactions:     rviews,
	}
	return connect.NewResponse(&zenaov1.GetPostResponse{Post: info}), nil
}
