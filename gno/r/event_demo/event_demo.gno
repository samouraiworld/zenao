package event_demo

import (
	"time"

	"gno.land/p/zenao/events"
	"gno.land/r/demo/profile"
)

var Event *events.Event

func init() {
	zenaoAdmin := "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94"
	creator := "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94" // replace w/ address of the user realm
	conf := events.Config{
		Creator:          creator,
		Title:            "Demo",
		Description:      "This is a demo zenao event",
		ImageURI:         "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Wiki-IMG_20200904_200004436.jpg/640px-Wiki-IMG_20200904_200004436.jpg",
		StartDate:        time.Now().Add(48 * time.Hour).Unix(),
		EndDate:          time.Now().Add(96 * time.Hour).Unix(),
		Capacity:         500,
		GetProfileString: profile.GetStringField,
		SetProfileString: profile.SetStringField,
		ZenaoAdminAddr:   zenaoAdmin,
		Location:         "To be disclosed",
	}
	Event = events.NewEvent(&conf)
}

func AddParticipant(participant string) {
	Event.AddParticipant(participant)
}

func RemoveParticipant(participant string) {
	Event.RemoveParticipant(participant)
}

func AddGatekeeper(gatekeeper string) {
	Event.AddGatekeeper(gatekeeper)
}

func RemoveGatekeeper(gatekeeper string) {
	Event.RemoveGatekeeper(gatekeeper)
}

func Edit(title, description, imageURI string, startDate, endDate int64, capacity uint64, location string) {
	Event.Edit(title, description, imageURI, startDate, endDate, capacity, location)
}

func Render(path string) string {
	return Event.Render(path)
}
