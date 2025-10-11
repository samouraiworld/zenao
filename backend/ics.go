package main

import (
	"fmt"
	"time"

	ics "github.com/arran4/golang-ical"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

// see: https://datatracker.ietf.org/doc/html/rfc5545
func GenerateICS(evtID string, evt *zenaov1.EventInfo, zenaoEmail string, logger *zap.Logger) []byte {
	uid := fmt.Sprintf("evt_%s@zenao.io", evtID)
	eventURL := fmt.Sprintf("https://zenao.io/event/%s", evtID)
	description := fmt.Sprintf("You are invited to %s!", evt.Title)
	location, err := zeni.LocationToString(evt.Location)
	if err != nil {
		logger.Error("failed to convert location to string", zap.Error(err), zap.String("event-id", evtID))
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
	event.SetSummary(evt.Title)
	event.SetDescription(description)
	event.SetStartAt(time.Unix(evt.StartDate, 0))
	event.SetEndAt(time.Unix(evt.EndDate, 0))
	event.SetURL(eventURL)
	event.SetLocation(location)
	event.SetStatus(ics.ObjectStatusConfirmed)
	// TODO: handle the ICS on-chain
	//event.SetSequence(int(evt.ICSSequenceNumber))
	// XXX: We could set the display name of the organizer if not empty
	event.SetOrganizer(zenaoEmail, ics.WithCN("Zenao"))

	// see:https://github.com/arran4/golang-ical/issues/116
	serialized := cal.Serialize(ics.WithNewLineWindows)
	return []byte(serialized)
}
