package events

import (
	"std"
	"testing"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/testutils"
	"gno.land/p/zenao/daokit"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
	carol = testutils.TestAddress("carol")
	dave  = testutils.TestAddress("dave")
)

func TestNewEvent(t *testing.T) {
	var profile mockProfile
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := Config{
		Creator:          alice.String(),
		Title:            "event",
		Description:      "this is an event",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
	}
	event := NewEvent(&conf)
	if event.DAOPrivate.Members.GetMembers()[1] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.DAOPrivate.Members.GetMembers()[1])
	}
	if !event.DAOPrivate.Members.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
}

func TestAddParticipant(t *testing.T) {
	var profile mockProfile
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := Config{
		Creator:          alice.String(),
		Title:            "event",
		Description:      "this is an event",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
	}
	event := NewEvent(&conf)
	if event.DAOPrivate.Members.GetMembers()[1] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.DAOPrivate.Members.GetMembers()[1])
	}
	if !event.DAOPrivate.Members.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(bob.String())))
	if event.DAOPrivate.Members.GetMembers()[2] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), event.DAOPrivate.Members.GetMembers()[2])
	}
	if !event.DAOPrivate.Members.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to have participant role")
	}

	daokit.InstantExecute(event.DAO, testReq(NewAddGatekeeperMsg(dave.String())))
	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(dave.String())))
	if len(event.DAOPrivate.Members.GetMembers()) != 4 {
		t.Fatalf("expected 4, got %d", len(event.DAOPrivate.Members.GetMembers()))
	}
	if !event.DAOPrivate.Members.HasRole(dave.String(), "gatekeeper") {
		t.Fatalf("expected dave to have gatekeeper role")
	}
	if !event.DAOPrivate.Members.HasRole(dave.String(), "participant") {
		t.Fatalf("expected dave to have participant role")
	}

	defer func() {
		if r := recover(); r == nil {
			t.Fatalf("expected panic, bob is not the organizer")
		}
	}()

	std.TestSetOriginCaller(bob)
	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(carol.String())))
}

func TestRemoveParticipant(t *testing.T) {
	var profile mockProfile
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := Config{
		Creator:          alice.String(),
		Title:            "event",
		Description:      "this is an event",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
	}
	event := NewEvent(&conf)
	if event.DAOPrivate.Members.GetMembers()[1] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), event.DAOPrivate.Members.GetMembers()[1])
	}
	if !event.DAOPrivate.Members.HasRole(alice.String(), "organizer") {
		t.Fatalf("expected user to have organizer role")
	}
	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(bob.String())))
	if event.DAOPrivate.Members.GetMembers()[2] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), event.DAOPrivate.Members.GetMembers()[2])
	}
	if !event.DAOPrivate.Members.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to have participant role")
	}
	daokit.InstantExecute(event.DAO, testReq(NewRemoveParticipantMsg(bob.String())))
	if len(event.DAOPrivate.Members.GetMembers()) != 2 {
		t.Fatalf("expected 2 member, got %d", len(event.DAOPrivate.Members.GetMembers()))
	}
	if event.DAOPrivate.Members.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to not have participant role")
	}
	daokit.InstantExecute(event.DAO, testReq(NewAddGatekeeperMsg(dave.String())))
	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(dave.String())))
	daokit.InstantExecute(event.DAO, testReq(NewRemoveParticipantMsg(dave.String())))
	if len(event.DAOPrivate.Members.GetMembers()) != 3 {
		t.Fatalf("expected 3 member, got %d", len(event.DAOPrivate.Members.GetMembers()))
	}
	if !event.DAOPrivate.Members.HasRole(dave.String(), "gatekeeper") {
		t.Fatalf("expected dave to have gatekeeper role")
	}
	if !event.DAOPrivate.Members.IsMember(dave.String()) {
		t.Fatalf("expected dave be a member")
	}
	daokit.InstantExecute(event.DAO, testReq(NewRemoveGatekeeperMsg(dave.String())))
	if len(event.DAOPrivate.Members.GetMembers()) != 2 {
		t.Fatalf("expected 2 members, got %d", len(event.DAOPrivate.Members.GetMembers()))
	}
	if event.DAOPrivate.Members.HasRole(dave.String(), "gatekeeper") {
		t.Fatalf("expected dave to not have gatekeeper role")
	}
	if event.DAOPrivate.Members.IsMember(dave.String()) {
		t.Fatalf("expected dave to not be a member")
	}
}

type mockProfile struct {
	fields avl.Tree
}

func (p *mockProfile) GetProfileString(addr std.Address, field string, def string) string {
	v, ok := p.fields.Get(field)
	if !ok {
		return def
	}
	return v.(string)
}

func (p *mockProfile) SetStringField(field, value string) bool {
	return p.fields.Set(field, value)
}

func testReq(msg daokit.ExecutableMessage) daokit.ProposalRequest {
	return daokit.ProposalRequest{
		Message: msg,
	}
}
