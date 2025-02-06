package events_test

import (
	"std"
	"testing"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/testutils"
	"gno.land/p/zenao/events"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
	carol = testutils.TestAddress("carol")
	dave  = testutils.TestAddress("dave")
)

func TestNewEvent(t *testing.T) {
	var profile mockProfile
	std.TestSetOrigCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := events.Config{
		Creator:          alice.String(),
		Title:            "event",
		Description:      "this is an event",
		SetProfileString: profile.SetStringField,
	}
	event := events.NewEvent(&conf)
	if event.Org.MemberModule.GetMembers()[1] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.Org.MemberModule.GetMembers()[1])
	}
	if !event.Org.MemberModule.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
}

func TestAddParticipant(t *testing.T) {
	var profile mockProfile
	std.TestSetOrigCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := events.Config{
		Creator:          alice.String(),
		Title:            "event",
		Description:      "this is an event",
		SetProfileString: profile.SetStringField,
	}
	event := events.NewEvent(&conf)
	if event.Org.MemberModule.GetMembers()[1] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.Org.MemberModule.GetMembers()[1])
	}
	if !event.Org.MemberModule.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
	event.AddParticipant(bob.String())
	if event.Org.MemberModule.GetMembers()[2] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), event.Org.MemberModule.GetMembers()[2])
	}
	if !event.Org.MemberModule.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to have participant role")
	}

	event.AddGatekeeper(dave.String())
	event.AddParticipant(dave.String())
	if len(event.Org.MemberModule.GetMembers()) != 4 {
		t.Fatalf("expected 4, got %d", len(event.Org.MemberModule.GetMembers()))
	}
	if !event.Org.MemberModule.HasRole(dave.String(), "gatekeeper") {
		t.Fatalf("expected dave to have gatekeeper role")
	}
	if !event.Org.MemberModule.HasRole(dave.String(), "participant") {
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
	var profile mockProfile
	std.TestSetOrigCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := events.Config{
		Creator:          alice.String(),
		Title:            "event",
		Description:      "this is an event",
		SetProfileString: profile.SetStringField,
	}
	event := events.NewEvent(&conf)
	if event.Org.MemberModule.GetMembers()[1] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.Org.MemberModule.GetMembers()[1])
	}
	if !event.Org.MemberModule.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
	event.AddParticipant(bob.String())
	if event.Org.MemberModule.GetMembers()[2] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), event.Org.MemberModule.GetMembers()[2])
	}
	if !event.Org.MemberModule.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to have participant role")
	}
	event.RemoveParticipant(bob.String())
	if len(event.Org.MemberModule.GetMembers()) != 2 {
		t.Fatalf("expected 2 member, got %d", len(event.Org.MemberModule.GetMembers()))
	}
	if event.Org.MemberModule.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to not have participant role")
	}
	event.AddGatekeeper(dave.String())
	event.AddParticipant(dave.String())
	event.RemoveParticipant(dave.String())
	if len(event.Org.MemberModule.GetMembers()) != 3 {
		t.Fatalf("expected 3 member, got %d", len(event.Org.MemberModule.GetMembers()))
	}
	if !event.Org.MemberModule.HasRole(dave.String(), "gatekeeper") {
		t.Fatalf("expected dave to have gatekeeper role")
	}
	if !event.Org.MemberModule.IsMember(dave.String()) {
		t.Fatalf("expected dave be a member")
	}
	event.RemoveGatekeeper(dave.String())
	if len(event.Org.MemberModule.GetMembers()) != 2 {
		t.Fatalf("expected 2 members, got %d", len(event.Org.MemberModule.GetMembers()))
	}
	if event.Org.MemberModule.HasRole(dave.String(), "gatekeeper") {
		t.Fatalf("expected dave to not have gatekeeper role")
	}
	if event.Org.MemberModule.IsMember(dave.String()) {
		t.Fatalf("expected dave to not be a member")
	}
}

type mockProfile struct {
	fields avl.Tree
}

func (p *mockProfile) SetStringField(field, value string) bool {
	return p.fields.Set(field, value)
}
