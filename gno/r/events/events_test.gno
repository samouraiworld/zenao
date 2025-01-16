package events

import (
	"std"
	"strings"
	"testing"
	"time"

	"gno.land/p/demo/urequire"
)

func TestEvents(t *testing.T) {
	initialOwner := std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94") // zenao-dev-admin
	std.TestSetRealm(std.NewUserRealm(initialOwner))

	// list no events
	{
		events := listEvents(time.Now(), time.Now().Add(time.Hour*24*365), 10)
		urequire.Equal(t, "", strings.Join(events, ", "))
	}

	// inject events
	events := []testEvent{
		{"1-future-event-month", "alice", time.Now().Add(30 * 24 * time.Hour)},
		{"2-future-event-day", "bob", time.Now().Add(24 * time.Hour)},
		{"3-past-event-hour", "alice", time.Now().Add(-time.Hour)},
		{"4-past-event-day", "bob", time.Now().Add(-24 * time.Hour)},
		{"5-past-event-month", "alice", time.Now().Add(-30 * 24 * time.Hour)},
	}
	for _, evt := range events {
		AddEvent(evt.id, evt.creator, evt.endDate)
	}

	// list upcoming events
	{
		events := listEvents(time.Now(), time.Now().Add(time.Hour*24*365), 10)
		urequire.Equal(t, `2-future-event-day, 1-future-event-month`, strings.Join(events, ", "))
	}
	// list past events
	{
		events := listEvents(time.Now(), time.Now().Add(-time.Hour*24*365), 10)
		urequire.Equal(t, `3-past-event-hour, 4-past-event-day, 5-past-event-month`, strings.Join(events, ", "))
	}

	// list events by creator
	{
		// from future to past
		events := listEventsByCreator("alice", time.Now().Add(time.Hour*24*365), time.Now().Add(-time.Hour*24*365), 10)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, strings.Join(events, ", "))
	}
	{
		// from past to future
		events := listEventsByCreator("bob", time.Now().Add(-time.Hour*24*365), time.Now().Add(time.Hour*24*365), 10)
		urequire.Equal(t, `4-past-event-day, 2-future-event-day`, strings.Join(events, ", "))
	}
	{
		// none
		events := listEventsByCreator("eve", time.Now().Add(-time.Hour*24*365), time.Now().Add(time.Hour*24*365), 10)
		urequire.Equal(t, "", strings.Join(events, ", "))
	}

	// inject participants
	participants := []testParticipant{
		{"eve", []int{0, 2, 4}},
		{"carol", []int{1, 3}},
	}
	for _, p := range participants {
		for _, eventIdx := range p.eventIdxs {
			evt := events[eventIdx]
			AddParticipant(p.id, evt.id, evt.endDate)
		}
	}

	// list events by participant
	{
		// from future to past
		events := listEventsByParticipant("eve", time.Now().Add(time.Hour*24*365), time.Now().Add(-time.Hour*24*365), 10)
		urequire.Equal(t, `1-future-event-month, 3-past-event-hour, 5-past-event-month`, strings.Join(events, ", "))
	}
	{
		// from past to future
		events := listEventsByParticipant("carol", time.Now().Add(-time.Hour*24*365), time.Now().Add(time.Hour*24*365), 10)
		urequire.Equal(t, `4-past-event-day, 2-future-event-day`, strings.Join(events, ", "))
	}
	{
		// none
		events := listEventsByParticipant("alice", time.Now().Add(-time.Hour*24*365), time.Now().Add(time.Hour*24*365), 10)
		urequire.Equal(t, "", strings.Join(events, ", "))
	}
}

type testEvent struct {
	id      string
	creator string
	endDate time.Time
}

type testParticipant struct {
	id        string
	eventIdxs []int
}
