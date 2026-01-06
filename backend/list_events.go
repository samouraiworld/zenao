package main

import (
	"context"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) ListEvents(ctx context.Context, req *connect.Request[zenaov1.ListEventsRequest]) (*connect.Response[zenaov1.ListEventsResponse], error) {
	var evts []*zeni.Event
	var infos []*zenaov1.EventInfo
	if err := s.DB.TxWithSpan(ctx, "ListEvents", func(tx zeni.DB) error {
		var err error
		evts, err = tx.ListEvents(int(req.Msg.Limit), int(req.Msg.Offset), req.Msg.From, req.Msg.To, req.Msg.DiscoverableFilter)
		if err != nil {
			return err
		}
		// XXX: find a way to this efficiently ? (one TX)
		for _, evt := range evts {
			organizers, err := tx.GetOrgUsersWithRoles(zeni.EntityTypeEvent, evt.ID, []string{zeni.RoleOrganizer})
			if err != nil {
				return err
			}
			gatekeepers, err := tx.GetOrgUsersWithRoles(zeni.EntityTypeEvent, evt.ID, []string{zeni.RoleGatekeeper})
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
				Id:           evt.ID,
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
			infos = append(infos, &info)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.ListEventsResponse{Events: infos}), nil
}
