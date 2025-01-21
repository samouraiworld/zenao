package event_realm

import (
	"gno.land/p/zenao/events"
	"gno.land/r/demo/profile"
)

var event *events.Event

func init() {
	eventID := "1"
	creator := "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94" // replace w/ address of the user realm
	event = events.NewEvent(eventID, creator, "title", "description", 0, 0, 0, 0)

	profile.SetStringField(profile.DisplayName, "title")
	profile.SetStringField(profile.Bio, "description")
	profile.SetStringField(profile.Avatar, "avatar")
}

func AddParticipant(participant string) {
	event.AddParticipant(participant)
}

func RemoveParticipant(participant string) {
	event.RemoveParticipant(participant)
}

func AddGatekeeper(gatekeeper string) {
	event.AddGatekeeper(gatekeeper)
}

func RemoveGatekeeper(gatekeeper string) {
	event.RemoveGatekeeper(gatekeeper)
}
