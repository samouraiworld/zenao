package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) ListEventsByOrganizer(ctx context.Context, req *connect.Request[zenaov1.ListEventsByOrganizerRequest]) (*connect.Response[zenaov1.EventsInfo], error) {
	if req.Msg.OrganizerId == "" {
		return nil, errors.New("organizer_id is required")
	}

	var evts []*zeni.Event
	var infos *zenaov1.EventsInfo
	if err := s.DB.TxWithSpan(ctx, "ListEvents", func(tx zeni.DB) error {
		var err error
		evts, err = tx.ListEvents(zeni.EntityTypeUser, req.Msg.OrganizerId, zeni.RoleOrganizer, int(req.Msg.Limit), int(req.Msg.Offset))
		if err != nil {
			return err
		}
		// XXX: find a way to this efficiently ? (one TX)
		for _, evt := range evts {
			organizers, err := tx.GetOrgUsersWithRole(zeni.EntityTypeEvent, evt.ID, zeni.RoleOrganizer)
			if err != nil {
				return err
			}
			gatekeepers, err := tx.GetOrgUsersWithRole(zeni.EntityTypeEvent, evt.ID, zeni.RoleGatekeeper)
			if err != nil {
				return err
			}
			participants, err := tx.CountEntities(zeni.EntityTypeEvent, evt.ID, zeni.EntityTypeUser, zeni.RoleParticipant)
			if err != nil {
				return err
			}
			checkedIn, err := tx.CountCheckedIn(evt.ID)
			if err != nil {
				return err
			}

			orgIDs := mapsl.Map(organizers, func(u *zeni.User) string {
				return u.ID
			})

			gkpIDs := mapsl.Map(gatekeepers, func(u *zeni.User) string {
				return u.ID
			})

			info := zenaov1.EventInfo{
				Title:        evt.Title,
				Description:  evt.Description,
				ImageUri:     evt.ImageURI,
				Organizers:   orgIDs,
				Gatekeepers:  gkpIDs,
				StartDate:    evt.StartDate.Unix(),
				EndDate:      evt.EndDate.Unix(),
				Capacity:     evt.Capacity,
				Location:     evt.Location,
				Participants: participants,
				CheckedIn:    checkedIn,
				Discoverable: evt.Discoverable,
			}
			infos.Events = append(infos.Events, &info)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(infos), nil
}
