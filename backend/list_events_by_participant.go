package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) ListEventsByParticipant(ctx context.Context, req *connect.Request[zenaov1.ListEventsByParticipantRequest]) (*connect.Response[zenaov1.ListEventsByParticipantResponse], error) {
	if req.Msg.ParticipantId == "" {
		return nil, errors.New("participant_id is required")
	}

	var evts []*zeni.Event
	var infos []*zenaov1.EventInfo
	if err := s.DB.TxWithSpan(ctx, "ListEvents", func(tx zeni.DB) error {
		var err error
		evts, err = tx.ListEvents(zeni.EntityTypeUser, req.Msg.ParticipantId, zeni.RoleParticipant, int(req.Msg.Limit), int(req.Msg.Offset))
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
				PkgPath:      s.Chain.EventRealmID(evt.ID), // TODO: remove usage in front-end to use ID instead ?

			}
			infos = append(infos, &info)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.ListEventsByParticipantResponse{Events: infos}), nil
}
