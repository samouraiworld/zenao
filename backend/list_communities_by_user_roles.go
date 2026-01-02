package main

import (
	"context"
	"errors"
	"sort"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) ListCommunitiesByUserRoles(ctx context.Context, req *connect.Request[zenaov1.ListCommunitiesByUserRolesRequest]) (*connect.Response[zenaov1.ListCommunitiesByUserRolesResponse], error) {
	if len(req.Msg.Roles) == 0 {
		return nil, errors.New("at least one role must be specified")
	}

	for _, role := range req.Msg.Roles {
		if !zeni.IsValidUserCommunityRole(role) {
			return nil, errors.New("community role should be one of: administrator, member (invalid: " + role + ")")
		}
	}

	var communityUsers []*zenaov1.CommunityUser
	if err := s.DB.TxWithSpan(ctx, "ListCommunitiesByUserRoles", func(tx zeni.DB) error {
		communitiesWithRoles, err := tx.ListCommunitiesByUserRoles(
			req.Msg.UserId,
			req.Msg.Roles,
			int(req.Msg.Limit),
			int(req.Msg.Offset),
		)
		if err != nil {
			return err
		}

		for _, cwr := range communitiesWithRoles {
			administrators, err := tx.GetOrgUsersWithRoles(zeni.EntityTypeCommunity, cwr.Community.ID, []string{zeni.RoleAdministrator})
			if err != nil {
				return err
			}
			memberCount, err := tx.CountEntities(zeni.EntityTypeCommunity, cwr.Community.ID, zeni.EntityTypeUser, zeni.RoleMember)
			if err != nil {
				return err
			}

			admIDs := mapsl.Map(administrators, func(u *zeni.User) string {
				return s.Chain.UserRealmID(u.ID)
			})

			sort.Strings(cwr.Roles)
			communityUsers = append(communityUsers, &zenaov1.CommunityUser{
				Community: &zenaov1.CommunityInfo{
					DisplayName:    cwr.Community.DisplayName,
					Description:    cwr.Community.Description,
					AvatarUri:      cwr.Community.AvatarURI,
					BannerUri:      cwr.Community.BannerURI,
					Administrators: admIDs,
					CountMembers:   memberCount,
					PkgPath:        s.Chain.CommunityRealmID(cwr.Community.ID),
				},
				Roles: cwr.Roles,
			})
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.ListCommunitiesByUserRolesResponse{
		Communities: communityUsers,
	}), nil
}
