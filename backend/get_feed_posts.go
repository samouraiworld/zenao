package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) GetFeedPosts(ctx context.Context, req *connect.Request[zenaov1.GetFeedPostsRequest]) (*connect.Response[zenaov1.GetFeedPostsResponse], error) {
	if req.Msg.FeedId == "" {
		return nil, errors.New("feed ID is required")
	}

	var (
		zUser      *zeni.User
		zPosts     []*zeni.Post
		PostsViews []*feedsv1.PostView
		err        error
	)

	user := s.Auth.GetUser(ctx)
	if user != nil {
		zUser, err = s.EnsureUserExists(ctx, user)
		if err != nil {
			return nil, err
		}
	}

	// TODO: see to improve this
	if err := s.DB.TxWithSpan(ctx, "GetFeedPosts", func(tx zeni.DB) error {
		zPosts, err = tx.GetPostsByFeedID(req.Msg.FeedId, int(req.Msg.Limit), int(req.Msg.Offset), req.Msg.Tags)
		if err != nil {
			return err
		}
		for _, zPost := range zPosts {
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
				if zUser != nil && reaction.UserID == zUser.ID {
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
			childrens, err := tx.CountChildrenPosts(zPost.ID)
			if err != nil {
				return err
			}
			pv := &feedsv1.PostView{
				Post:          zPost.Post,
				ChildrenCount: childrens,
				Reactions:     rviews,
			}
			PostsViews = append(PostsViews, pv)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.GetFeedPostsResponse{Posts: PostsViews}), nil
}
