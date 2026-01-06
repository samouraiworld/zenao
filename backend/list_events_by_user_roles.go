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

func (s *ZenaoServer) ListEventsByUserRoles(ctx context.Context, req *connect.Request[zenaov1.ListEventsByUserRolesRequest]) (*connect.Response[zenaov1.ListEventsByUserRolesResponse], error) {
	if len(req.Msg.Roles) == 0 {
		return nil, errors.New("at least one role must be specified")
	}

	for _, role := range req.Msg.Roles {
		if !zeni.IsValidEventRole(role) {
			return nil, errors.New("event role should be one of: organizer, gatekeeper, participant (invalid: " + role + ")")
		}
	}

	// Viewing undiscoverable events is restricted to the user themselves
	if req.Msg.DiscoverableFilter != zenaov1.DiscoverableFilter_DISCOVERABLE_FILTER_DISCOVERABLE {
		user := s.Auth.GetUser(ctx)
		if user == nil {
			return nil, errors.New("unauthorized: authentication required to view undiscoverable events")
		}
		zUser, err := s.EnsureUserExists(ctx, user)
		if err != nil {
			return nil, err
		}
		if zUser.ID != req.Msg.UserId {
			return nil, errors.New("unauthorized: user_id must match authenticated user")
		}
	}

	var eventUsers []*zenaov1.EventUser
	if err := s.DB.TxWithSpan(ctx, "ListEventsByUserRoles", func(tx zeni.DB) error {
		eventsWithRoles, err := tx.ListEventsByUserRoles(
			req.Msg.UserId,
			req.Msg.Roles,
			int(req.Msg.Limit),
			int(req.Msg.Offset),
			req.Msg.From,
			req.Msg.To,
			req.Msg.DiscoverableFilter,
		)
		if err != nil {
			return err
		}

		// XXX: optimize with a single query to get all organizers/gatekeepers/participants counts for all events ?
		for _, ewr := range eventsWithRoles {
			organizers, err := tx.GetOrgUsersWithRoles(zeni.EntityTypeEvent, ewr.Event.ID, []string{zeni.RoleOrganizer})
			if err != nil {
				return err
			}
			gatekeepers, err := tx.GetOrgUsersWithRoles(zeni.EntityTypeEvent, ewr.Event.ID, []string{zeni.RoleGatekeeper})
			if err != nil {
				return err
			}
			participants, err := tx.CountEntities(zeni.EntityTypeEvent, ewr.Event.ID, zeni.EntityTypeUser, zeni.RoleParticipant)
			if err != nil {
				return err
			}
			checkedIn, err := tx.CountCheckedIn(ewr.Event.ID)
			if err != nil {
				return err
			}

			orgIDs := mapsl.Map(organizers, func(u *zeni.User) string {
				return u.ID
			})
			gkpIDs := mapsl.Map(gatekeepers, func(u *zeni.User) string {
				return u.ID
			})

			sort.Strings(ewr.Roles)
			eventUsers = append(eventUsers, &zenaov1.EventUser{
				Event: &zenaov1.EventInfo{
					Id:           ewr.Event.ID,
					Title:        ewr.Event.Title,
					Description:  ewr.Event.Description,
					ImageUri:     ewr.Event.ImageURI,
					Organizers:   orgIDs,
					Gatekeepers:  gkpIDs,
					StartDate:    ewr.Event.StartDate.Unix(),
					EndDate:      ewr.Event.EndDate.Unix(),
					Capacity:     ewr.Event.Capacity,
					Location:     ewr.Event.Location,
					Participants: participants,
					CheckedIn:    checkedIn,
					Discoverable: ewr.Event.Discoverable,
				},
				Roles: ewr.Roles,
			})
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.ListEventsByUserRolesResponse{
		Events: eventUsers,
	}), nil
}
