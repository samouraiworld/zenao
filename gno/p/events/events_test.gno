package events

import (
	"std"
	"testing"

	"gno.land/p/demo/testutils"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
	carol = testutils.TestAddress("carol")
	dave  = testutils.TestAddress("dave")
)

func TestNewEvent(t *testing.T) {
	std.TestSetOrigCaller(alice)
	event := NewEvent("1", alice.String(), 0, 0, 0, 0)
	if event.event.MemberModule.GetMembers()[0] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.event.MemberModule.GetMembers()[0])
	}
	if !event.event.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
}

func TestAddParticipant(t *testing.T) {
	std.TestSetOrigCaller(alice)
	event := NewEvent("1", alice.String(), 0, 0, 0, 0)
	if event.event.MemberModule.GetMembers()[0] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.event.MemberModule.GetMembers()[0])
	}
	if !event.event.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
	std.TestSetOrigCaller(alice)
	event.AddParticipant(bob.String())
	if event.event.MemberModule.GetMembers()[1] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), event.event.MemberModule.GetMembers()[1])
	}
	if !event.event.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to have participant role")
	}

	defer func() {
		if r := recover(); r == nil {
			t.Fatalf("expected panic, bob is not the organizer")
		}
	}()

	std.TestSetOrigCaller(bob)
	event.AddParticipant(carol.String())
}

func TestRemoveParticipant(t *testing.T) {
	std.TestSetOrigCaller(alice)
	event := NewEvent("1", alice.String(), 0, 0, 0, 0)
	if event.event.MemberModule.GetMembers()[0] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.event.MemberModule.GetMembers()[0])
	}
	if !event.event.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
	std.TestSetOrigCaller(alice)
	event.AddParticipant(bob.String())
	if event.event.MemberModule.GetMembers()[1] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), event.event.MemberModule.GetMembers()[1])
	}
	if !event.event.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to have participant role")
	}
	std.TestSetOrigCaller(alice)
	event.RemoveParticipant(bob.String())
	if len(event.event.MemberModule.GetMembers()) != 1 {
		t.Fatalf("expected 1 member, got %d", len(event.event.MemberModule.GetMembers()))
	}
	if event.event.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to not have participant role")
	}
}
