package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) ListCommunitiesByEvent(ctx context.Context, req *connect.Request[zenaov1.ListCommunitiesByEventRequest]) (*connect.Response[zenaov1.ListCommunitiesByEventResponse], error) {
	if req.Msg.EventId == "" {
		return nil, errors.New("event_id is required")
	}

	var cmts []*zeni.Community
	var infos []*zenaov1.CommunityInfo
	if err := s.DB.TxWithSpan(ctx, "ListCommunitiesByEvent", func(tx zeni.DB) error {
		var err error
		cmts, err = tx.ListCommunities(zeni.EntityTypeEvent, req.Msg.EventId, zeni.RoleEvent, int(req.Msg.Limit), int(req.Msg.Offset))
		if err != nil {
			return err
		}
		// XXX: find a way to this efficiently ? (one TX)
		for _, cmt := range cmts {
			adm, err := tx.GetOrgUsersWithRoles(zeni.EntityTypeCommunity, cmt.ID, []string{zeni.RoleAdministrator})
			if err != nil {
				return err
			}
			count, err := tx.CountEntities(zeni.EntityTypeCommunity, cmt.ID, zeni.EntityTypeUser, zeni.RoleMember)
			if err != nil {
				return err
			}

			admIDs := mapsl.Map(adm, func(u *zeni.User) string {
				return u.ID
			})

			info := zenaov1.CommunityInfo{
				Id:             cmt.ID,
				DisplayName:    cmt.DisplayName,
				Description:    cmt.Description,
				AvatarUri:      cmt.AvatarURI,
				BannerUri:      cmt.BannerURI,
				Administrators: admIDs,
				CountMembers:   count,
			}
			infos = append(infos, &info)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.ListCommunitiesByEventResponse{Communities: infos}), nil
}
