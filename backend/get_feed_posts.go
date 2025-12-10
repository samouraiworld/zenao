package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) GetFeedPosts(ctx context.Context, req *connect.Request[zenaov1.GetFeedPostsRequest]) (*connect.Response[zenaov1.GetFeedPostsResponse], error) {
	if req.Msg.Org == nil || req.Msg.Org.EntityId == "" || req.Msg.Org.EntityType == "" {
		return nil, errors.New("organization entity is required")
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

	// TODO: see to optimize this
	if err := s.DB.TxWithSpan(ctx, "GetFeedPosts", func(tx zeni.DB) error {
		feed, err := tx.GetFeed(req.Msg.Org.EntityType, req.Msg.Org.EntityId, "main")
		if err != nil {
			return err
		}
		s.Logger.Info("get-feed-posts", zap.String("org-type", req.Msg.Org.EntityType), zap.String("org-id", req.Msg.Org.EntityId), zap.String("feed-id", feed.ID), zap.Uint32("limit", req.Msg.Limit), zap.Uint32("offset", req.Msg.Offset), zap.Strings("tags", req.Msg.Tags))
		zPosts, err = tx.GetPostsByFeedID(feed.ID, int(req.Msg.Limit), int(req.Msg.Offset), req.Msg.Tags)
		if err != nil {
			return err
		}
		s.Logger.Info("fetched-posts-count", zap.Int("count", len(zPosts)))
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
			s.Logger.Log(zap.DebugLevel, "post-view", zap.Any("post-view", pv), zap.Any("post-deep", pv.Post.Post))
			PostsViews = append(PostsViews, pv)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	resp := &zenaov1.GetFeedPostsResponse{Posts: PostsViews}
	s.Logger.Log(zap.DebugLevel, "any", zap.Any("any", resp))

	return connect.NewResponse(resp), nil
}
