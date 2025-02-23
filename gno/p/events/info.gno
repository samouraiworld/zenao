package events

import (
	"std"

	zenaov1 "gno.land/p/zenao/zenao/v1"
)

type InfoGetter func() *zenaov1.EventInfo

func (e *Event) Info() *zenaov1.EventInfo {
	return &zenaov1.EventInfo{
		Title:        e.getProfileString(std.CurrentRealm().Addr(), "DisplayName", ""),
		Description:  e.getProfileString(std.CurrentRealm().Addr(), "Bio", ""),
		ImageUri:     e.getProfileString(std.CurrentRealm().Addr(), "Avatar", ""),
		StartDate:    e.startDate,
		EndDate:      e.endDate,
		Capacity:     e.capacity,
		Creator:      e.creator,
		Location:     e.location,
		Participants: e.CountParticipants(),
	}
}
