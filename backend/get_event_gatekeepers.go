package main

import (
	"context"
	"errors"
	"slices"

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

	var gatekeepers []*zeni.User
	if err := s.DB.Tx(func(db zeni.DB) error {
		roles, err := db.UserRoles(zUser.ID, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, "organizer") {
			return errors.New("user is not organizer of the event")
		}
		gatekeepers, err = db.GetEventUsersWithRole(req.Msg.EventId, "gatekeeper")
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	gkpsIDs := mapsl.Map(gatekeepers, func(gk *zeni.User) string {
		return gk.AuthID
	})

	users, err := s.Auth.GetUsersFromIDs(ctx, gkpsIDs)
	if err != nil {
		return nil, err
	}

	gkpsEmails := mapsl.Map(users, func(u *zeni.AuthUser) string {
		return u.Email
	})

	return connect.NewResponse(&zenaov1.GetEventGatekeepersResponse{Gatekeepers: gkpsEmails}), nil
}
