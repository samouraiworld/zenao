package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) GetEvent(ctx context.Context, req *connect.Request[zenaov1.GetEventRequest]) (*connect.Response[zenaov1.EventInfo], error) {
	if req.Msg.EventId == "" {
		return nil, errors.New("event ID is required")
	}

	var (
		evt          *zeni.Event
		organizers   []*zeni.User
		gatekeepers  []*zeni.User
		participants uint32
		checkedIn    uint32
	)

	if err := s.DB.TxWithSpan(ctx, "GetEvent", func(tx zeni.DB) error {
		var err error
		evt, err = tx.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}
		organizers, err = tx.GetOrgUsersWithRole(zeni.EntityTypeEvent, req.Msg.EventId, zeni.RoleOrganizer)
		if err != nil {
			return err
		}
		gatekeepers, err = tx.GetOrgUsersWithRole(zeni.EntityTypeEvent, req.Msg.EventId, zeni.RoleGatekeeper)
		if err != nil {
			return err
		}
		participants, err = tx.CountEntities(zeni.EntityTypeEvent, req.Msg.EventId, zeni.EntityTypeUser, zeni.RoleParticipant)
		if err != nil {
			return err
		}
		checkedIn, err = tx.CountCheckedIn(req.Msg.EventId)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
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

	return connect.NewResponse(&info), nil
}
