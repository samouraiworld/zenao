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
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-event-gatekeepers", zap.String("event-id", req.Msg.EventId), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	var gatekeepers []*zeni.User
	if err := s.DB.TxWithSpan(ctx, "db.GetEventGatekeepers", func(db zeni.DB) error {
		roles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleOrganizer) {
			return errors.New("user is not organizer of the event")
		}
		gatekeepers, err = db.GetOrgUsersWithRoles(zeni.EntityTypeEvent, req.Msg.EventId, []string{zeni.RoleGatekeeper})
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
