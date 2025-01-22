package event_realm

import (
	"std"
	"time"

	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	"gno.land/p/zenao/events"
	"gno.land/r/demo/profile"
)

var event *events.Event

func init() {
	eventID := "1"
	creator := "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94" // replace w/ address of the user realm
	event = events.NewEvent(eventID, creator, "title", "description", 0, 0, 0, 0, profile.GetStringField)

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

func Render(path string) string {
	s := md.H1(profile.GetStringField(std.CurrentRealm().Addr(), profile.DisplayName, ""))
	s += md.Image("Event presentation", profile.GetStringField(std.CurrentRealm().Addr(), profile.Avatar, ""))
	s += md.Paragraph(profile.GetStringField(std.CurrentRealm().Addr(), profile.Bio, ""))
	s += md.BulletList([]string{
		ufmt.Sprintf("Time: From %s to %s", time.Unix(event.GetStartDate(), 0).Format(time.DateTime), time.Unix(event.GetEndDate(), 0).Format(time.DateTime)),
		ufmt.Sprintf("Price: %d€", event.GetTicketPrice()),
		ufmt.Sprintf("Capacity: %d/%d", event.CountParticipants(), event.GetCapacity()),
		ufmt.Sprintf("Organizer: %s", profile.GetStringField(std.Address(event.GetCreator()), profile.DisplayName, "")),
	}) + "\n"
	s += md.HorizontalRule()
	s += md.Paragraph(std.CurrentRealm().Addr().String())
	return s
}
