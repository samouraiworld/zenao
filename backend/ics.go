package main

import (
	"fmt"
	"time"

	ics "github.com/arran4/golang-ical"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

// see: https://datatracker.ietf.org/doc/html/rfc5545
func GenerateICS(zEvent *zeni.Event, zenaoEmail string, logger *zap.Logger) []byte {
	uid := fmt.Sprintf("evt_%s@zenaooo.io", zEvent.ID)
	eventURL := fmt.Sprintf("https://zenao.io/event/%s", zEvent.ID)
	description := fmt.Sprintf("You are invited to %s!", zEvent.Title)
	location, err := zeni.LocationToString(zEvent.Location)
	if err != nil {
		logger.Error("failed to convert location to string", zap.Error(err), zap.String("event-id", zEvent.ID))
		location = ""
	}
	cal := ics.NewCalendar()
	cal.SetCalscale("GREGORIAN")
	cal.SetProductId("-//Zenao//EN")
	cal.SetVersion("2.0")
	cal.SetMethod(ics.MethodRequest)
	event := cal.AddEvent(uid)
	event.SetCreatedTime(time.Now().UTC())
	event.SetDtStampTime(time.Now().UTC())
	event.SetSummary(zEvent.Title)
	event.SetDescription(description)
	event.SetStartAt(zEvent.StartDate)
	event.SetEndAt(zEvent.EndDate)
	event.SetURL(eventURL)
	event.SetLocation(location)
	event.SetStatus(ics.ObjectStatusConfirmed)
	event.SetSequence(int(zEvent.ICSSequenceNumber))
	// XXX: We could set the display name of the organizer if not empty
	event.SetOrganizer(zenaoEmail, ics.WithCN("Zenao"))

	// see:https://github.com/arran4/golang-ical/issues/116
	serialized := cal.Serialize(ics.WithNewLineWindows)
	return []byte(serialized)
}
