package event_realm

import (
	"gno.land/p/zenao/events"
	"gno.land/r/zenao/events_reg"
)

var event *events.Event

func init() {
	eventID := "1"
	creator = "g16jv3rpz7mkt0gqulxas56se2js7v5vmc6n6e0r" // replace w/ address of the user realm
	eventEndDate = 0
	event = events.NewEvent(eventID, creator, eventEndDate)
	events_reg.AddEvent(eventID, creator, eventEndDate)
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
