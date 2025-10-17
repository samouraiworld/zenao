package events

import (
	"encoding/base64"

	zenaov1 "gno.land/p/zenao/zenao/v1"
)

type InfoGetter func() *zenaov1.EventInfo

func (e *Event) Info() *zenaov1.EventInfo {
	privacy := &zenaov1.EventPrivacy{}
	if len(e.ParticipationPubkey) == 0 {
		privacy.EventPrivacy = &zenaov1.EventPrivacyPublic{}
	} else {
		privacy.EventPrivacy = &zenaov1.EventPrivacyGuarded{
			ParticipationPubkey: base64.RawURLEncoding.EncodeToString(e.ParticipationPubkey),
			PasswordHash:        e.PasswordHash,
		}
	}

	if e.Cancelled {
		return nil
	}

	realmAddr := e.DAOPrivate.Realm.Address()

	return &zenaov1.EventInfo{
		Title:        e.GetProfileString(realmAddr, "DisplayName", ""),
		Description:  e.GetProfileString(realmAddr, "Bio", ""),
		ImageUri:     e.GetProfileString(realmAddr, "Avatar", ""),
		StartDate:    e.StartDate,
		EndDate:      e.EndDate,
		Capacity:     e.Capacity,
		Organizers:   e.DAOPrivate.Members.GetMembersWithRole("organizer"),
		Gatekeepers:  e.DAOPrivate.Members.GetMembersWithRole("gatekeeper"),
		Location:     e.Location,
		Participants: e.CountParticipants(),
		CheckedIn:    e.CheckedIn,
		Discoverable: e.Discoverable,
		Privacy:      privacy,
	}
}
