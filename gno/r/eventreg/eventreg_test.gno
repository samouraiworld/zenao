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
	testing.SetRealm(std.NewUserRealm(initialOwner))

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
		{"gno.land/r/zenao/events/future_event_month_1", []string{"alice"}, time.Now().Add(30 * 24 * time.Hour)},
		{"gno.land/r/zenao/events/future_event_day_2", []string{"bob"}, time.Now().Add(24 * time.Hour)},
		{"gno.land/r/zenao/events/past_event_hour_3", []string{"alice"}, time.Now().Add(-time.Hour)},
		{"gno.land/r/zenao/events/past_event_day_4", []string{"bob"}, time.Now().Add(-24 * time.Hour)},
		{"gno.land/r/zenao/events/past_event_month_5", []string{"alice"}, time.Now().Add(-30 * 24 * time.Hour)},
		{"gno.land/r/zenao/events/event_will_change_6", []string{"bob"}, time.Now().Add(-60 * 24 * time.Hour)},
	}
	for _, evt := range evts {
		// XXX: `ev := evt` and using ev in place of evt will cause "gno.land/r/zenao/eventreg: test pkg: panic: unexpected type heapitem"
		testing.SetRealm(std.NewCodeRealm(evt.id))
		getters[evt.id] = func() *zenaov1.EventInfo {
			return &zenaov1.EventInfo{
				Organizers:   evt.organizers,
				EndDate:      evt.endDate.Unix(),
				Discoverable: true,
			}
		}
		Register(cross, getters[evt.id])
		testing.SetRealm(std.NewUserRealm(initialOwner))

		IndexEvent(cross, evt.id)
	}

	// list upcoming events
	{
		events := listEvents(time.Now().Unix(), nextYearUnix, 10, 0)
		urequire.Equal(t, `future_event_day_2, future_event_month_1`, eventsString(events), "future events list should match")
	}
	// list past events
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10, 0)
		urequire.Equal(t, `past_event_hour_3, past_event_day_4, past_event_month_5, event_will_change_6`, eventsString(events))
	}

	// list events by organizer
	{
		// from future to past
		events := listEventsByOrganizer("alice", nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `future_event_month_1, past_event_hour_3, past_event_month_5`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByOrganizer("bob", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `event_will_change_6, past_event_day_4, future_event_day_2`, eventsString(events))
	}
	{
		// none
		events := listEventsByOrganizer("eve", lastYearUnix, nextYearUnix, 10, 0)
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
			AddParticipant(cross, evt.id, p.id)
		}
	}

	// list events by participant
	{
		// from future to past
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `future_event_month_1, past_event_hour_3, past_event_month_5`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByParticipant("carol", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `event_will_change_6, past_event_day_4, future_event_day_2`, eventsString(events))
	}
	{
		// none
		events := listEventsByParticipant("alice", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, 0, len(events))
	}

	// chane event endDate and rerun all tests

	evts[5].endDate = time.Now().Add(60 * 24 * time.Hour)
	UpdateIndex(cross, evts[5].id)

	// list upcoming events
	{
		events := listEvents(time.Now().Unix(), nextYearUnix, 10, 0)
		urequire.Equal(t, `future_event_day_2, future_event_month_1, event_will_change_6`, eventsString(events))
	}
	{
		// list upcoming events with offset 1
		events := listEvents(time.Now().Unix(), nextYearUnix, 10, 1)
		urequire.Equal(t, `future_event_month_1, event_will_change_6`, eventsString(events))
	}
	// list past events
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10, 0)
		urequire.Equal(t, `past_event_hour_3, past_event_day_4, past_event_month_5`, eventsString(events))
	}
	// list past events with offset 1 and limit 1
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 1, 1)
		urequire.Equal(t, `past_event_day_4`, eventsString(events))
	}
	// list past event with offset 1
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10, 1)
		urequire.Equal(t, `past_event_day_4, past_event_month_5`, eventsString(events))
	}

	// list events by organizer
	{
		// from future to past
		events := listEventsByOrganizer("alice", nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `future_event_month_1, past_event_hour_3, past_event_month_5`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByOrganizer("bob", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `past_event_day_4, future_event_day_2, event_will_change_6`, eventsString(events))
	}

	// list events by participant
	{
		// from future to past
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `future_event_month_1, past_event_hour_3, past_event_month_5`, eventsString(events))
	}
	{
		// from future to past with offset 2
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10, 2)
		urequire.Equal(t, `past_event_month_5`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByParticipant("carol", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `past_event_day_4, future_event_day_2, event_will_change_6`, eventsString(events))
	}
	{
		// none
		events := listEventsByParticipant("alice", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, 0, len(events))
	}

	// chane event organizer and rerun all tests

	evts[5].organizers = []string{"alice"}
	UpdateIndex(cross, evts[5].id)

	// list upcoming events
	{
		events := listEvents(time.Now().Unix(), nextYearUnix, 10, 0)
		urequire.Equal(t, `future_event_day_2, future_event_month_1, event_will_change_6`, eventsString(events))
	}
	// list past events
	{
		events := listEvents(time.Now().Unix(), lastYearUnix, 10, 0)
		urequire.Equal(t, `past_event_hour_3, past_event_day_4, past_event_month_5`, eventsString(events))
	}

	// list events by organizer
	{
		// from future to past
		events := listEventsByOrganizer("alice", nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `event_will_change_6, future_event_month_1, past_event_hour_3, past_event_month_5`, eventsString(events))
	}
	{
		// from future to past with offset 2
		events := listEventsByOrganizer("alice", nextYearUnix, lastYearUnix, 10, 2)
		urequire.Equal(t, `past_event_hour_3, past_event_month_5`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByOrganizer("bob", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `past_event_day_4, future_event_day_2`, eventsString(events))
	}
	{
		// from past to future with offset 2
		events := listEventsByOrganizer("bob", lastYearUnix, nextYearUnix, 10, 2)
		urequire.Equal(t, 0, len(events))
	}

	// list events by participant
	{
		// from future to past
		events := listEventsByParticipant("eve", nextYearUnix, lastYearUnix, 10, 0)
		urequire.Equal(t, `future_event_month_1, past_event_hour_3, past_event_month_5`, eventsString(events))
	}
	{
		// from past to future
		events := listEventsByParticipant("carol", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, `past_event_day_4, future_event_day_2, event_will_change_6`, eventsString(events))
	}
	{
		// none
		events := listEventsByParticipant("alice", lastYearUnix, nextYearUnix, 10, 0)
		urequire.Equal(t, 0, len(events))
	}
}

func TestEventsWithNonDiscoverable(t *testing.T) {
	initialOwner := std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94") // zenao-dev-admin
	testing.SetRealm(std.NewUserRealm(initialOwner))

	organizers := []string{"johnny"}
	nextYearUnix := time.Now().Add(time.Hour * 24 * 365).Unix()
	lastYearUnix := time.Now().Add(-time.Hour * 24 * 365).Unix()
	endDateUnix := time.Now().Add(30 * 24 * time.Hour).Unix()

	getters := map[string]events.InfoGetter{}
	evts := []*struct {
		id           string
		discoverable bool
	}{
		{"gno.land/r/zenao/events/e1", false},
		{"gno.land/r/zenao/events/e2", true},
		{"gno.land/r/zenao/events/e3", false},
		{"gno.land/r/zenao/events/e4", true},
		{"gno.land/r/zenao/events/e5", false},
		{"gno.land/r/zenao/events/e6", true},
		{"gno.land/r/zenao/events/e7", false},
		{"gno.land/r/zenao/events/e8", true},
	}

	for _, evt := range evts {
		// XXX: `ev := evt` and using ev in place of evt will cause "gno.land/r/zenao/eventreg: test pkg: panic: unexpected type heapitem"
		testing.SetRealm(std.NewCodeRealm(evt.id))
		getters[evt.id] = func() *zenaov1.EventInfo {
			return &zenaov1.EventInfo{
				Discoverable: evt.discoverable,
				Organizers:   organizers,
				EndDate:      endDateUnix,
			}
		}
		Register(cross, getters[evt.id])
		testing.SetRealm(std.NewUserRealm(initialOwner))
		IndexEvent(cross, evt.id)
	}

	cases := []struct {
		limit  uint32
		offset uint32
		out    string
	}{
		{limit: 3, offset: 2, out: "e6, e8"},
		{limit: 2, offset: 4, out: ""},
		{limit: 2, offset: 3, out: "e8"},
	}

	for _, tc := range cases {
		t.Run(fmt.Sprintf("offset:%d,limit:%d", tc.offset, tc.limit), func(t *testing.T) {
			// We list by organizer "johnny" to prevent mixing with other tests.
			events := listEventsByOrganizer("johnny", lastYearUnix, nextYearUnix, tc.limit, tc.offset)

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
