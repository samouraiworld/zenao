package eventreg

import (
	"std"
	"strings"
	"testing"
	"time"

	"gno.land/p/demo/urequire"
	"gno.land/p/zenao/events"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

// XXX: Add tests for multiple organizers
func TestEvents(t *testing.T) {
	initialOwner := std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94") // zenao-dev-admin
	std.TestSetRealm(std.NewUserRealm(initialOwner))

	nextYearUnix := time.Now().Add(time.Hour * 24 * 365).Unix()
	lastYearUnix := time.Now().Add(-time.Hour * 24 * 365).Unix()

	// list no events
	{
		events := listEvents(time.Now().Unix(), nextYearUnix, 10)
		urequire.Equal(t, 0, len(events))
	}

	// inject evts
	getters := map[string]events.InfoGetter{}
	evts := []*struct {
		id         string
		organizers []string
		endDate    time.Time
	}{
		{"gno.land/r/zenao/events/1-future-event-month", []string{"alice"}, time.Now().Add(30 * 24 * time.Hour)},
		{"gno.land/r/zenao/events/2-future-event-day", []string{"bob"}, time.Now().Add(24 * time.Hour)},
		{"gno.land/r/zenao/events/3-past-event-hour", []string{"alice"}, time.Now().Add(-time.Hour)},
		{"gno.land/r/zenao/events/4-past-event-day", []string{"bob"}, time.Now().Add(-24 * time.Hour)},
		{"gno.land/r/zenao/events/5-past-event-month", []string{"alice"}, time.Now().Add(-30 * 24 * time.Hour)},
		{"gno.land/r/zenao/events/6-event-will-change", []string{"bob"}, time.Now().Add(-60 * 24 * time.Hour)},
	}
	for _, evt := range evts {
		// XXX: `ev := evt` and using ev in place of evt will cause "gno.land/r/zenao/eventreg: test pkg: panic: unexpected type heapitem"
		std.TestSetRealm(std.NewCodeRealm(evt.id))
		getters[evt.id] = func() *zenaov1.EventInfo {
			return &zenaov1.EventInfo{
				Organizers: evt.organizers,
				EndDate:    evt.endDate.Unix(),
			}
		}
		Register(getters[evt.id])
		std.TestSetRealm(std.NewUserRealm(initialOwner))

		IndexEvent(evt.id)
	}

	// list upcoming events
	{
		events := listEvents(time.Now().Unix(), nextYearUnix, 10)
		urequire.Equal(t, `2-future-event-day, 1-future-event-month`, eventsString(events), "future events list should match")
	}
	// list past events
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10)
		urequire.Equal(t, `3-past-event-hour, 4-past-event-day, 5-past-event-month, 6-event-will-change`, eventsString(events))
	}

	// list events by organizer
	{
		// from future to past
		events := listEventsByOrganizer("alice", nextYearUnix, lastYearUnix, 10)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByOrganizer("bob", lastYearUnix, nextYearUnix, 10)
		urequire.Equal(t, `6-event-will-change, 4-past-event-day, 2-future-event-day`, eventsString(events))
	}
	{
		// none
		events := listEventsByOrganizer("eve", lastYearUnix, nextYearUnix, 10)
		urequire.Equal(t, 0, len(events))
	}

	// inject participants
	participants := []struct {
		id        string
		eventIdxs []int
	}{
		{"eve", []int{0, 2, 4}},
		{"carol", []int{1, 3, 5}},
	}
	for _, p := range participants {
		for _, eventIdx := range p.eventIdxs {
			evt := evts[eventIdx]
			AddParticipant(evt.id, p.id)
		}
	}

	// list events by participant
	{
		// from future to past
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByParticipant("carol", lastYearUnix, nextYearUnix, 10)
		urequire.Equal(t, `6-event-will-change, 4-past-event-day, 2-future-event-day`, eventsString(events))
	}
	{
		// none
		events := listEventsByParticipant("alice", lastYearUnix, nextYearUnix, 10)
		urequire.Equal(t, 0, len(events))
	}

	// chane event endDate and rerun all tests

	evts[5].endDate = time.Now().Add(60 * 24 * time.Hour)
	UpdateIndex(evts[5].id)

	// list upcoming events
	{
		events := listEvents(time.Now().Unix(), nextYearUnix, 10)
		urequire.Equal(t, `2-future-event-day, 1-future-event-month, 6-event-will-change`, eventsString(events))
	}
	// list past events
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10)
		urequire.Equal(t, `3-past-event-hour, 4-past-event-day, 5-past-event-month`, eventsString(events))
	}

	// list events by organizer
	{
		// from future to past
		events := listEventsByOrganizer("alice", nextYearUnix, lastYearUnix, 10)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByOrganizer("bob", lastYearUnix, nextYearUnix, 10)
		urequire.Equal(t, `4-past-event-day, 2-future-event-day, 6-event-will-change`, eventsString(events))
	}

	// list events by participant
	{
		// from future to past
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByParticipant("carol", lastYearUnix, nextYearUnix, 10)
		urequire.Equal(t, `4-past-event-day, 2-future-event-day, 6-event-will-change`, eventsString(events))
	}
	{
		// none
		events := listEventsByParticipant("alice", lastYearUnix, nextYearUnix, 10)
		urequire.Equal(t, 0, len(events))
	}

	// chane event organizer and rerun all tests

	evts[5].organizers = []string{"alice"}
	UpdateIndex(evts[5].id)

	// list upcoming events
	{
		events := listEvents(time.Now().Unix(), nextYearUnix, 10)
		urequire.Equal(t, `2-future-event-day, 1-future-event-month, 6-event-will-change`, eventsString(events))
	}
	// list past events
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10)
		urequire.Equal(t, `3-past-event-hour, 4-past-event-day, 5-past-event-month`, eventsString(events))
	}

	// list events by organizer
	{
		// from future to past
		events := listEventsByOrganizer("alice", nextYearUnix, lastYearUnix, 10)
		urequire.Equal(t, `6-event-will-change, 1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByOrganizer("bob", lastYearUnix, nextYearUnix, 10)
		urequire.Equal(t, `4-past-event-day, 2-future-event-day`, eventsString(events))
	}

	// list events by participant
	{
		// from future to past
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByParticipant("carol", lastYearUnix, nextYearUnix, 10)
		urequire.Equal(t, `4-past-event-day, 2-future-event-day, 6-event-will-change`, eventsString(events))
	}
	{
		// none
		events := listEventsByParticipant("alice", lastYearUnix, nextYearUnix, 10)
		urequire.Equal(t, 0, len(events))
	}
}

func TestEventsToJSON(t *testing.T) {
	evts := []*zenaov1.EventInfo{{
		PkgPath: "foo",
		Location: &zenaov1.EventLocation{Address: &zenaov1.AddressCustom{
			Address:  "Paris",
			Timezone: "Europe/Paris",
		}},
	}}
	urequire.Equal(t, `[{"location":{"custom":{"address":"Paris","timezone":"Europe/Paris"}},"pkgPath":"foo"}]`, eventsToJSON(evts))
}

func TestLocationToString(t *testing.T) {
	loc := &zenaov1.EventLocation{Address: &zenaov1.AddressCustom{
		Address:  "Paris",
		Timezone: "Europe/Paris",
	}}
	str, err := events.LocationString(loc)
	urequire.NoError(t, err)
	urequire.Equal(t, "Paris", str)
}

func eventsString(evts []*zenaov1.EventInfo) string {
	res := []string{}
	for _, evt := range evts {
		res = append(res, strings.TrimPrefix(evt.PkgPath, "gno.land/r/zenao/events/"))
	}
	return strings.Join(res, ", ")
}
