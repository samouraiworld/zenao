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
	creator := "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94" // replace w/ address of the user realm
	conf := events.Config{
		Creator:          creator,
		Title:            "title",
		Description:      "descritpion",
		GetProfileString: profile.GetStringField,
	}
	event = events.NewEvent(&conf)

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

func EditEvent(title, description, imageURI string, startDate, endDate int64, capacity uint64, location string) {
	event.AssertCallerIsOrganizer()

	profile.SetStringField(profile.DisplayName, title)
	profile.SetStringField(profile.Bio, description)
	profile.SetStringField(profile.Avatar, imageURI)

	event.StartDate = startDate
	event.EndDate = endDate
	event.Capacity = capacity
	event.Location = location
}

func Render(path string) string {
	s := md.H1(profile.GetStringField(std.CurrentRealm().Addr(), profile.DisplayName, ""))
	s += md.Image("Event presentation", profile.GetStringField(std.CurrentRealm().Addr(), profile.Avatar, ""))
	s += md.Paragraph(profile.GetStringField(std.CurrentRealm().Addr(), profile.Bio, ""))
	s += md.BulletList([]string{
		ufmt.Sprintf("Time: From %s to %s", time.Unix(event.StartDate, 0).Format(time.DateTime), time.Unix(event.EndDate, 0).Format(time.DateTime)),
		ufmt.Sprintf("Capacity: %d/%d", event.CountParticipants(), event.Capacity),
		ufmt.Sprintf("Organizer: %s", profile.GetStringField(std.Address(event.Creator), profile.DisplayName, "")),
	}) + "\n"
	s += md.HorizontalRule()
	s += md.Paragraph(std.CurrentRealm().Addr().String())
	return s
}
