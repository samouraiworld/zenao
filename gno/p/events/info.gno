package events

import (
	"encoding/base64"
	"std"

	zenaov1 "gno.land/p/zenao/zenao/v1"
)

type InfoGetter func() *zenaov1.EventInfo

func (e *Event) Info() *zenaov1.EventInfo {
	privacy := &zenaov1.EventPrivacy{}
	if len(e.participationPubkey) == 0 {
		privacy.EventPrivacy = &zenaov1.EventPrivacyPublic{}
	} else {
		privacy.EventPrivacy = &zenaov1.EventPrivacyGuarded{
			ParticipationPubkey: base64.RawURLEncoding.EncodeToString(e.participationPubkey),
		}
	}

	if e.cancelled {
		return nil
	}

	return &zenaov1.EventInfo{
		Title:        e.getProfileString(std.CurrentRealm().Address(), "DisplayName", ""),
		Description:  e.getProfileString(std.CurrentRealm().Address(), "Bio", ""),
		ImageUri:     e.getProfileString(std.CurrentRealm().Address(), "Avatar", ""),
		StartDate:    e.startDate,
		EndDate:      e.endDate,
		Capacity:     e.capacity,
		Organizers:   e.DAOPrivate.Members.GetMembersWithRole("organizer"),
		Gatekeepers:  e.DAOPrivate.Members.GetMembersWithRole("gatekeeper"),
		Location:     e.location,
		Participants: e.CountParticipants(),
		CheckedIn:    e.checkedIn,
		Discoverable: e.discoverable,
		Privacy:      privacy,
	}
}
