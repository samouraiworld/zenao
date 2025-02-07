package events

import (
	"std"
)

type Info struct {
	Title        string
	Description  string
	ImageURI     string
	Creator      string
	StartDate    int64 // unix seconds
	EndDate      int64 // unix seconds
	Capacity     uint64
	Location     string
	Participants int
}

type InfoGetter func() Info

func (e *Event) Info() Info {
	return Info{
		Title:        e.GetProfileString(std.CurrentRealm().Addr(), "DisplayName", ""),
		Description:  e.GetProfileString(std.CurrentRealm().Addr(), "Bio", ""),
		ImageURI:     e.GetProfileString(std.CurrentRealm().Addr(), "Avatar", ""),
		StartDate:    e.StartDate,
		EndDate:      e.EndDate,
		Capacity:     e.Capacity,
		Creator:      e.Creator,
		Location:     e.Location,
		Participants: e.CountParticipants(),
	}
}
