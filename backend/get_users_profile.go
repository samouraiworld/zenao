package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) GetUsersProfile(ctx context.Context, req *connect.Request[zenaov1.GetUsersProfileRequest]) (*connect.Response[zenaov1.GetUsersProfileResponse], error) {
	if len(req.Msg.Ids) == 0 {
		return nil, errors.New("ids array required")
	}

	var zUsers []*zeni.User
	if err := s.DB.TxWithSpan(ctx, "GetUsersProfile", func(tx zeni.DB) error {
		var err error
		zUsers, err = tx.GetUsersByIDs(req.Msg.Ids)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	profiles := []*zenaov1.Profile{}
	for _, zUser := range zUsers {
		profile := &zenaov1.Profile{
			Address:     s.Chain.UserRealmID(zUser.ID), // TODO: adapt front-end to expect id instead of address ?
			DisplayName: zUser.DisplayName,
			Bio:         zUser.Bio,
			AvatarUri:   zUser.AvatarURI,
		}
		profiles = append(profiles, profile)
	}

	return connect.NewResponse(&zenaov1.GetUsersProfileResponse{Profiles: profiles}), nil
}
