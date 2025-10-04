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

func (s *ZenaoServer) CreatePost(ctx context.Context, req *connect.Request[zenaov1.CreatePostRequest]) (*connect.Response[zenaov1.CreatePostResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("create-standard-post", zap.String("org-type", req.Msg.OrgType), zap.String("org-id", req.Msg.OrgId), zap.String("content", req.Msg.Content), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if req.Msg.OrgType != zeni.EntityTypeEvent && req.Msg.OrgType != zeni.EntityTypeCommunity {
		return nil, errors.New("invalid org type (must be event or community)")
	}

	//XXX: do more verification ?
	if len(req.Msg.Content) == 0 {
		return nil, errors.New("content of standard post cannot be empty")
	}

	for _, tag := range req.Msg.Tags {
		if len(tag) == 0 {
			return nil, errors.New("a tag value cannot be empty")
		}
	}

	roles, err := s.DB.WithContext(ctx).EntityRoles(zeni.EntityTypeUser, zUser.ID, req.Msg.OrgType, req.Msg.OrgId)
	if err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return nil, errors.New("user is not a member of the event")
	}

	post := &feedsv1.Post{
		Loc:       nil,
		Tags:      req.Msg.Tags,
		ParentUri: req.Msg.ParentId,
		Post: &feedsv1.Post_Standard{
			Standard: &feedsv1.StandardPost{
				Content: req.Msg.Content,
			},
		},
	}

	postID, err := s.Chain.WithContext(ctx).CreatePost(zUser.ID, req.Msg.OrgType, req.Msg.OrgId, post)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreatePostResponse{PostId: postID}), nil
}
