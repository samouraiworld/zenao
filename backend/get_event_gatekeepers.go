package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) GetEventGatekeepers(ctx context.Context, req *connect.Request[zenaov1.GetEventGatekeepersRequest]) (*connect.Response[zenaov1.GetEventGatekeepersResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-event-gatekeepers", zap.String("event-id", req.Msg.EventId), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	eventRealmID := s.Chain.WithContext(ctx).EventRealmID(req.Msg.EventId)
	gatekeepers, err := s.Chain.WithContext(ctx).GetEventUsersByRole(eventRealmID, zeni.RoleGatekeeper)
	if err != nil {
		return nil, err
	}

	var gkpsIDs []string
	for _, gk := range gatekeepers {
		// TODO: actually in future we are not sure a gatekeeper is always a user
		id, err := s.Chain.WithContext(ctx).FromRealmIDToID(gk, "u")
		if err != nil {
			return nil, err
		}
		gkpsIDs = append(gkpsIDs, id)
	}

	gkps, err := s.DB.GetUsersFromIDs(gkpsIDs)
	if err != nil {
		return nil, err
	}

	gkpsAuthIDs := mapsl.Map(gkps, func(u *zeni.User) string {
		return u.AuthID
	})

	users, err := s.Auth.GetUsersFromIDs(ctx, gkpsAuthIDs)
	if err != nil {
		return nil, err
	}

	gkpsEmails := mapsl.Map(users, func(u *zeni.AuthUser) string {
		return u.Email
	})

	return connect.NewResponse(&zenaov1.GetEventGatekeepersResponse{Gatekeepers: gkpsEmails}), nil
}
