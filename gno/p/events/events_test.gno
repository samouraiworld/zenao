package events

import (
	"encoding/base64"
	"math/rand"
	"std"
	"testing"
	"time"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/testutils"
	"gno.land/p/demo/urequire"
	"gno.land/p/zenao/daokit"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
	carol = testutils.TestAddress("carol")
	dave  = testutils.TestAddress("dave")
)

// XXX: Add tests for multiple organizers
func TestNewEvent(t *testing.T) {
	var profile mockProfile
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := Config{
		Organizers:       []string{alice.String()},
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
		Organizers:       []string{alice.String()},
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
	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(bob.String(), testTicket(t), "")))
	if event.DAOPrivate.Members.GetMembers()[2] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), event.DAOPrivate.Members.GetMembers()[2])
	}
	if !event.DAOPrivate.Members.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to have participant role")
	}

	daokit.InstantExecute(event.DAO, testReq(NewAddGatekeeperMsg(dave.String())))
	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(dave.String(), testTicket(t), "")))
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
	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(carol.String(), testTicket(t), "")))
}

func TestRemoveParticipant(t *testing.T) {
	var profile mockProfile
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := Config{
		Organizers:       []string{alice.String()},
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
	ticket := testTicket(t)
	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(bob.String(), ticket, "")))
	if event.DAOPrivate.Members.GetMembers()[2] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), event.DAOPrivate.Members.GetMembers()[2])
	}
	if !event.DAOPrivate.Members.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to have participant role")
	}
	daokit.InstantExecute(event.DAO, testReq(NewRemoveParticipantMsg(bob.String(), ticket)))
	if len(event.DAOPrivate.Members.GetMembers()) != 2 {
		t.Fatalf("expected 2 member, got %d", len(event.DAOPrivate.Members.GetMembers()))
	}
	if event.DAOPrivate.Members.HasRole(bob.String(), "participant") {
		t.Fatalf("expected bob to not have participant role")
	}
	ticket = testTicket(t)
	daokit.InstantExecute(event.DAO, testReq(NewAddGatekeeperMsg(dave.String())))
	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(dave.String(), ticket, "")))
	daokit.InstantExecute(event.DAO, testReq(NewRemoveParticipantMsg(dave.String(), ticket)))
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

func TestTicket(t *testing.T) {
	var profile mockProfile
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := Config{
		Organizers:       []string{alice.String()},
		Title:            "event",
		Description:      "this is an event",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
	}
	event := NewEvent(&conf)

	// generated via `go run ./backend genticket --gatekeeper g1vdshymmvta047h6lta047h6lta047h6l2asz94`
	// the gatekeeper address is carol.String()
	// ticketSeed := "tiHISz3XZAqX53WVelnM2IpXOFGrF894GEHBpmK3gN8"
	ticketPubkey := "utIh1Wp6OwyGIVaMQH0GYMfT0zzq4zycS1MTwGFQ3Jk"
	ticketSignature := "BDWVj17wWiwTpIQfYcTw0Gji9xUZG1P07kb9IBzLkYfgx0QkxOtWzbdckzn9xzVoX7kz8q73Z32SZz1medlACA"

	daokit.InstantExecute(event.DAO, testReq(NewAddGatekeeperMsg(carol.String())))

	daokit.InstantExecute(event.DAO, testReq(NewAddParticipantMsg(bob.String(), ticketPubkey, "")))
	val, ok := event.tickets.Get(ticketPubkey)
	urequire.True(t, ok, "ticket must exist")
	ticket := val.(*Ticket)
	if ticket == nil {
		t.Fatalf("ticket must not be nil after participating")
	}
	urequire.Equal(t, bob.String(), ticket.Participant, "invalid participant in ticket")
	if ticket.UsedAt != nil {
		t.Fatalf("UsedAt must be nil when ticket is not used")
	}

	std.TestSetOriginCaller(carol)
	now := time.Now()
	daokit.InstantExecute(event.DAO, testReq(NewCheckinMsg(ticketPubkey, ticketSignature)))
	urequire.Equal(t, bob.String(), ticket.Participant, "invalid participant in ticket after use")
	if ticket.UsedAt == nil {
		t.Fatalf("UsedAt must not be nil when ticket is used")
	}
	urequire.Equal(t, now.Format(time.RFC3339Nano), ticket.UsedAt.Format(time.RFC3339Nano), "invalid UsedAt")
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

func testTicket(t *testing.T) string {
	t.Helper()
	// invalid random test ticket
	res := make([]byte, 32)
	for i := 0; i < len(res); i++ {
		res[i] = byte(rand.UintN(2 ^ 8))
	}
	return base64.RawURLEncoding.EncodeToString(res)
}
