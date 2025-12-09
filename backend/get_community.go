package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) GetCommunity(ctx context.Context, req *connect.Request[zenaov1.GetCommunityRequest]) (*connect.Response[zenaov1.GetCommunityResponse], error) {
	if req.Msg.CommunityId == "" {
		return nil, errors.New("community ID is required")
	}

	var (
		cmt   *zeni.Community
		adm   []*zeni.User
		count uint32
	)
	if err := s.DB.TxWithSpan(ctx, "db.GetCommunity", func(db zeni.DB) error {
		var err error
		cmt, err = db.GetCommunity(req.Msg.CommunityId)
		if err != nil {
			return err
		}
		adm, err = db.GetOrgUsersWithRoles(zeni.EntityTypeCommunity, req.Msg.CommunityId, []string{zeni.RoleAdministrator})
		if err != nil {
			return err
		}
		count, err = db.CountEntities(zeni.EntityTypeCommunity, req.Msg.CommunityId, zeni.EntityTypeUser, zeni.RoleMember)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	admIDs := mapsl.Map(adm, func(u *zeni.User) string {
		return u.ID
	})

	info := zenaov1.CommunityInfo{
		DisplayName:    cmt.DisplayName,
		Description:    cmt.Description,
		AvatarUri:      cmt.AvatarURI,
		BannerUri:      cmt.BannerURI,
		Administrators: admIDs,
		CountMembers:   count,
	}

	return connect.NewResponse(&zenaov1.GetCommunityResponse{Community: &info}), nil
}
