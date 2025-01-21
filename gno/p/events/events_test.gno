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
	event := NewEvent("1", alice.String(), "event", "this is an event", 0, 0, 0, 0)
	if event.org.MemberModule.GetMembers()[0] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.org.MemberModule.GetMembers()[0])
	}
	if !event.org.MemberModule.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
}

func TestAddParticipant(t *testing.T) {
	std.TestSetOrigCaller(alice)
	event := NewEvent("1", alice.String(), "event", "this is an event", 0, 0, 0, 0)
	if event.org.MemberModule.GetMembers()[0] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.org.MemberModule.GetMembers()[0])
	}
	if !event.org.MemberModule.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
	event.AddParticipant(bob.String())
	if event.org.MemberModule.GetMembers()[1] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), event.org.MemberModule.GetMembers()[1])
	}
	if !event.org.MemberModule.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to have participant role")
	}

	event.AddGatekeeper(dave.String())
	event.AddParticipant(dave.String())
	if len(event.org.MemberModule.GetMembers()) != 3 {
		t.Fatalf("expected 3, got %d", dave.String(), len(event.org.MemberModule.GetMembers()))
	}
	if !event.org.MemberModule.HasRole(dave.String(), "gatekeeper") {
		t.Fatalf("expected dave to have gatekeeper role")
	}
	if !event.org.MemberModule.HasRole(dave.String(), "participant") {
		t.Fatalf("expected dave to have participant role")
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
	event := NewEvent("1", alice.String(), "event", "this is an event", 0, 0, 0, 0)
	if event.org.MemberModule.GetMembers()[0] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.org.MemberModule.GetMembers()[0])
	}
	if !event.org.MemberModule.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
	event.AddParticipant(bob.String())
	if event.org.MemberModule.GetMembers()[1] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), event.org.MemberModule.GetMembers()[1])
	}
	if !event.org.MemberModule.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to have participant role")
	}
	event.RemoveParticipant(bob.String())
	if len(event.org.MemberModule.GetMembers()) != 1 {
		t.Fatalf("expected 1 member, got %d", len(event.org.MemberModule.GetMembers()))
	}
	if event.org.MemberModule.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to not have participant role")
	}
	event.AddGatekeeper(dave.String())
	event.AddParticipant(dave.String())
	event.RemoveParticipant(dave.String())
	if len(event.org.MemberModule.GetMembers()) != 2 {
		t.Fatalf("expected 2 member, got %d", len(event.org.MemberModule.GetMembers()))
	}
	if !event.org.MemberModule.HasRole(dave.String(), "gatekeeper") {
		t.Fatalf("expected dave to have gatekeeper role")
	}
	if !event.org.MemberModule.IsMember(dave.String()) {
		t.Fatalf("expected dave be a member")
	}
	event.RemoveGatekeeper(dave.String())
	if len(event.org.MemberModule.GetMembers()) != 1 {
		t.Fatalf("expected 1 members, got %d", len(event.org.MemberModule.GetMembers()))
	}
	if event.org.MemberModule.HasRole(dave.String(), "gatekeeper") {
		t.Fatalf("expected dave to not have gatekeeper role")
	}
	if event.org.MemberModule.IsMember(dave.String()) {
		t.Fatalf("expected dave to not be a member")
	}
}
