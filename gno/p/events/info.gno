package events

import (
	"errors"
	"std"
	"strings"

	"gno.land/p/demo/ufmt"
	zenaov1 "gno.land/p/zenao/v1"
)

type InfoGetter func() *zenaov1.EventInfo

func (e *Event) Info() *zenaov1.EventInfo {
	return &zenaov1.EventInfo{
		Title:        e.GetProfileString(std.CurrentRealm().Addr(), "DisplayName", ""),
		Description:  e.GetProfileString(std.CurrentRealm().Addr(), "Bio", ""),
		ImageUri:     e.GetProfileString(std.CurrentRealm().Addr(), "Avatar", ""),
		StartDate:    e.StartDate,
		EndDate:      e.EndDate,
		Capacity:     e.Capacity,
		Creator:      e.Creator,
		Location:     e.Location,
		Participants: e.CountParticipants(),
		PkgPath:      e.PkgPath,
	}
}

func LocationString(location *zenaov1.EventLocation) (string, error) {
	if location == nil {
		return "", errors.New("nil location")
	}

	buf := &strings.Builder{}

	if location.VenueName != "" {
		buf.WriteString(location.VenueName)
		buf.WriteString(" - ")
	}

	switch val := location.Address.(type) {
	case *zenaov1.AddressVirtual:
		buf.WriteString(val.Uri)
	case *zenaov1.AddressGeo:
		buf.WriteString(val.Address)
		buf.WriteString(ufmt.Sprintf("- %g, %g", val.Lat, val.Lng))
	case *zenaov1.AddressCustom:
		buf.WriteString(val.Address)
	default:
		return "", errors.New("unsupported address type")
	}

	return buf.String(), nil
}
