package event_realm

import (
	"gno.land/p/zenao/events"
	"gno.land/r/demo/profile"
	"gno.land/r/zenao/events_reg"
)

var event *events.Event

func init() {
	eventID := "1"
	creator := "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94" // replace w/ address of the user realm
	event = events.NewEvent(eventID, creator, 0, 0, 0, 0)
	// events_reg.AddEvent(eventID, creator, event.GetEndDate()) // break the linting rule

	profile.SetStringField(profile.DisplayName, "title")
	profile.SetStringField(profile.Bio, "description")
	profile.SetStringField(profile.Avatar, "avatar")
}

func AddParticipant(participant string) {
	event.AddParticipant(participant)
	events_reg.AddParticipant(event.GetID(), participant, event.GetEndDate())
}

func RemoveParticipant(participant string) {
	event.RemoveParticipant(participant)
	events_reg.RemoveParticipant(event.GetID(), participant, event.GetEndDate())
}

func AddGatekeeper(gatekeeper string) {
	event.AddGatekeeper(gatekeeper)
}

func RemoveGatekeeper(gatekeeper string) {
	event.RemoveGatekeeper(gatekeeper)
}
