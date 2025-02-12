package events

import (
	"std"

	zenaov1 "gno.land/p/zenao/v1"
)

type InfoGetter func() *zenaov1.EventInfo

func (e *Event) Info() *zenaov1.EventInfo {
	return &zenaov1.EventInfo{
		Title:        e.GetProfileString(std.CurrentRealm().Addr(), "DisplayName", ""),
		Description:  e.GetProfileString(std.CurrentRealm().Addr(), "Bio", ""),
		ImageURI:     e.GetProfileString(std.CurrentRealm().Addr(), "Avatar", ""),
		StartDate:    e.StartDate,
		EndDate:      e.EndDate,
		Capacity:     e.Capacity,
		Creator:      e.Creator,
		Location:     e.Location,
		Participants: e.CountParticipants(),
		PkgPath:      e.PkgPath,
	}
}
