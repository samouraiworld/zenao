package eventreg

import (
	"fmt"
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
		events := listEvents(time.Now().Unix(), nextYearUnix, 10, 0)
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
				Organizers:   evt.organizers,
				EndDate:      evt.endDate.Unix(),
				Discoverable: true,
			}
		}
		Register(getters[evt.id])
		std.TestSetRealm(std.NewUserRealm(initialOwner))

		IndexEvent(evt.id)
	}

	// list upcoming events
	{
		events := listEvents(time.Now().Unix(), nextYearUnix, 10, 0)
		urequire.Equal(t, `2-future-event-day, 1-future-event-month`, eventsString(events), "future events list should match")
	}
	// list past events
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10, 0)
		urequire.Equal(t, `3-past-event-hour, 4-past-event-day, 5-past-event-month, 6-event-will-change`, eventsString(events))
	}

	// list events by organizer
	{
		// from future to past
		events := listEventsByOrganizer("alice", false, nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByOrganizer("bob", false, lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `6-event-will-change, 4-past-event-day, 2-future-event-day`, eventsString(events))
	}
	{
		// none
		events := listEventsByOrganizer("eve", false, lastYearUnix, nextYearUnix, 10, 0)
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
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByParticipant("carol", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `6-event-will-change, 4-past-event-day, 2-future-event-day`, eventsString(events))
	}
	{
		// none
		events := listEventsByParticipant("alice", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, 0, len(events))
	}

	// chane event endDate and rerun all tests

	evts[5].endDate = time.Now().Add(60 * 24 * time.Hour)
	UpdateIndex(evts[5].id)

	// list upcoming events
	{
		events := listEvents(time.Now().Unix(), nextYearUnix, 10, 0)
		urequire.Equal(t, `2-future-event-day, 1-future-event-month, 6-event-will-change`, eventsString(events))
	}
	{
		// list upcoming events with offset 1
		events := listEvents(time.Now().Unix(), nextYearUnix, 10, 1)
		urequire.Equal(t, `1-future-event-month, 6-event-will-change`, eventsString(events))
	}
	// list past events
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10, 0)
		urequire.Equal(t, `3-past-event-hour, 4-past-event-day, 5-past-event-month`, eventsString(events))
	}
	// list past events with offset 1 and limit 1
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 1, 1)
		urequire.Equal(t, `4-past-event-day`, eventsString(events))
	}
	// list past event with offset 1
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10, 1)
		urequire.Equal(t, `4-past-event-day, 5-past-event-month`, eventsString(events))
	}

	// list events by organizer
	{
		// from future to past
		events := listEventsByOrganizer("alice", false, nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByOrganizer("bob", false, lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `4-past-event-day, 2-future-event-day, 6-event-will-change`, eventsString(events))
	}

	// list events by participant
	{
		// from future to past
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from future to past with offset 2
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10, 2)
		urequire.Equal(t, `5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByParticipant("carol", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `4-past-event-day, 2-future-event-day, 6-event-will-change`, eventsString(events))
	}
	{
		// none
		events := listEventsByParticipant("alice", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, 0, len(events))
	}

	// chane event organizer and rerun all tests

	evts[5].organizers = []string{"alice"}
	UpdateIndex(evts[5].id)

	// list upcoming events
	{
		events := listEvents(time.Now().Unix(), nextYearUnix, 10, 0)
		urequire.Equal(t, `2-future-event-day, 1-future-event-month, 6-event-will-change`, eventsString(events))
	}
	// list past events
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10, 0)
		urequire.Equal(t, `3-past-event-hour, 4-past-event-day, 5-past-event-month`, eventsString(events))
	}

	// list events by organizer
	{
		// from future to past
		events := listEventsByOrganizer("alice", false, nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `6-event-will-change, 1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from future to past with offset 2
		events := listEventsByOrganizer("alice", false, nextYearUnix, lastYearUnix, 10, 2)
		urequire.Equal(t, `3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByOrganizer("bob", false, lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `4-past-event-day, 2-future-event-day`, eventsString(events))
	}
	{
		// from past to future with offset 2
		events := listEventsByOrganizer("bob", false, lastYearUnix, nextYearUnix, 10, 2)
		urequire.Equal(t, 0, len(events))
	}

	// list events by participant
	{
		// from future to past
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByParticipant("carol", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `4-past-event-day, 2-future-event-day, 6-event-will-change`, eventsString(events))
	}
	{
		// none
		events := listEventsByParticipant("alice", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, 0, len(events))
	}
}

func TestEventsWithNonDiscoverable(t *testing.T) {
	initialOwner := std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94") // zenao-dev-admin
	std.TestSetRealm(std.NewUserRealm(initialOwner))

	organizers := []string{"johnny"}
	nextYearUnix := time.Now().Add(time.Hour * 24 * 365).Unix()
	lastYearUnix := time.Now().Add(-time.Hour * 24 * 365).Unix()
	endDateUnix := time.Now().Add(30 * 24 * time.Hour).Unix()

	getters := map[string]events.InfoGetter{}
	evts := []*struct {
		id           string
		discoverable bool
	}{
		{"gno.land/r/zenao/events/1", false},
		{"gno.land/r/zenao/events/2", true},
		{"gno.land/r/zenao/events/3", false},
		{"gno.land/r/zenao/events/4", true},
		{"gno.land/r/zenao/events/5", false},
		{"gno.land/r/zenao/events/6", true},
		{"gno.land/r/zenao/events/7", false},
		{"gno.land/r/zenao/events/8", true},
	}

	for _, evt := range evts {
		// XXX: `ev := evt` and using ev in place of evt will cause "gno.land/r/zenao/eventreg: test pkg: panic: unexpected type heapitem"
		std.TestSetRealm(std.NewCodeRealm(evt.id))
		getters[evt.id] = func() *zenaov1.EventInfo {
			return &zenaov1.EventInfo{
				Discoverable: evt.discoverable,
				Organizers:   organizers,
				EndDate:      endDateUnix,
			}
		}
		Register(getters[evt.id])
		std.TestSetRealm(std.NewUserRealm(initialOwner))
		IndexEvent(evt.id)
	}

	cases := []struct {
		limit  uint32
		offset uint32
		out    string
	}{
		{limit: 3, offset: 2, out: "6, 8"},
		{limit: 2, offset: 4, out: ""},
		{limit: 2, offset: 3, out: "8"},
	}

	for _, tc := range cases {
		t.Run(fmt.Sprintf("offset:%d,limit:%d", tc.offset, tc.limit), func(t *testing.T) {
			// We list by organizer "johnny" to prevent mixing with other tests.
			events := listEventsByOrganizer("johnny", false, lastYearUnix, nextYearUnix, tc.limit, tc.offset)

			// The offset and limit are respected and the non-discoverable events are skipped.
			urequire.Equal(t, tc.out, eventsString(events))
		})
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
