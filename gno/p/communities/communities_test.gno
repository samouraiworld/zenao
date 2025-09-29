package communities

import (
	"strings"
	"testing"

	"gno.land/p/nt/testutils"
	"gno.land/p/nt/urequire"
	"gno.land/p/zenao/daokit"
	"gno.land/r/zenao/mockprofile"
)

// XXX: remove this
var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
	carol = testutils.TestAddress("carol")
	dave  = testutils.TestAddress("dave")
	eve   = testutils.TestAddress("eve")
)

var testUsers = func() map[string]address {
	res := map[string]address{}
	for _, name := range []string{"alice", "bob", "carol", "dave", "eve", "zenaoadm"} {
		res[name] = testutils.TestAddress(name)
	}
	return res
}()

var testUsersByAddr = func() map[address]string {
	res := map[address]string{}
	for name, addr := range testUsers {
		res[addr] = name
	}
	return res
}()

func usersNames(addrs []string) []string {
	res := make([]string, 0, len(addrs))
	for _, addr := range addrs {
		name, ok := testUsersByAddr[address(addr)]
		if !ok {
			name = addr
		}
		res = append(res, name)
	}
	return res
}

func TestNewCommunity(t *testing.T) {
	profile := &mockprofile.MockProfile{}
	testing.SetRealm(testing.NewCodeRealm("gno.land/r/zenao/events/e1"))

	conf := Config{
		Administrators:   []string{alice.String(), bob.String()},
		Members:          []string{carol.String(), dave.String(), eve.String()},
		Events:           []string{},
		DisplayName:      "Community Name",
		Description:      "this is a community",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
		ZenaoAdminAddr:   testUsers["zenaoadm"].String(),
	}
	community := NewCommunity(&conf)
	if len(community.DAOPrivate.Members.GetMembers()) != 6 {
		t.Fatalf("expected 6 members, got %d", len(community.DAOPrivate.Members.GetMembers()))
	}
	// the creator also get the administrator role
	if community.DAOPrivate.Members.CountMembersWithRole("administrator") != 2 {
		t.Fatalf("expected 2 administrators, got %d", community.DAOPrivate.Members.CountMembersWithRole("administrator"))
	}
	if community.DAOPrivate.Members.CountMembersWithRole("member") != 3 {
		t.Fatalf("expected 0 members, got %d", community.DAOPrivate.Members.CountMembersWithRole("member"))
	}
	if community.DAOPrivate.Members.CountMembersWithRole("event") != 0 {
		t.Fatalf("expected 0 event, got %d", community.DAOPrivate.Members.CountMembersWithRole("event"))
	}
	if !community.DAOPrivate.Members.HasRole(alice.String(), "administrator") {
		t.Fatalf("expected user to have creator role")
	}
	if !community.DAOPrivate.Members.HasRole(eve.String(), "member") {
		t.Fatalf("expected user to have member role")
	}
}

func TestAddMember(t *testing.T) {
	profile := &mockprofile.MockProfile{}
	testing.SetContext(testing.Context{
		CurrentRealm: testing.NewUserRealm(alice),
	})
	testing.SetRealm(testing.NewCodeRealm("gno.land/r/zenao/communities/c1"))

	conf := Config{
		ZenaoAdminAddr:   testUsers["zenaoadm"].String(),
		Administrators:   []string{alice.String()},
		Members:          []string{carol.String(), dave.String()},
		Events:           []string{},
		DisplayName:      "Community Name",
		Description:      "this is a community",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
	}
	community := NewCommunity(&conf)

	if len(community.DAOPrivate.Members.GetMembers()) != 4 {
		t.Fatalf("expected 4 members, got %d", len(community.DAOPrivate.Members.GetMembers()))
	}
	urequire.Equal(t, "zenaoadm, dave, alice, carol", strings.Join(usersNames(community.DAOPrivate.Members.GetMembers()), ", "))

	if !community.DAOPrivate.Members.HasRole(carol.String(), "member") {
		t.Fatalf("expected carol to have member role")
	}
	daokit.InstantExecute(community.DAO, testReq(NewAddMemberAction(bob.String())))
	if len(community.DAOPrivate.Members.GetMembers()) != 5 {
		t.Fatalf("expected 5 members, got %d", len(community.DAOPrivate.Members.GetMembers()))
	}
	if !community.DAOPrivate.Members.HasRole(bob.String(), "member") {
		t.Fatalf("expected bob to have member role")
	}
}

func TestRemoveMember(t *testing.T) {
	profile := &mockprofile.MockProfile{}
	testing.SetContext(testing.Context{
		CurrentRealm: testing.NewUserRealm(alice),
	})
	testing.SetRealm(testing.NewCodeRealm("gno.land/r/zenao/communities/c1"))
	conf := Config{
		ZenaoAdminAddr:   testUsers["zenaoadm"].String(),
		Administrators:   []string{alice.String()},
		Members:          []string{carol.String(), dave.String()},
		Events:           []string{},
		DisplayName:      "Community Name",
		Description:      "this is a community",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
	}
	community := NewCommunity(&conf)
	if len(community.DAOPrivate.Members.GetMembers()) != 4 {
		t.Fatalf("expected 4 members, got %d", len(community.DAOPrivate.Members.GetMembers()))
	}
	if !community.DAOPrivate.Members.HasRole(carol.String(), "member") {
		t.Fatalf("expected carol to have member role")
	}
	if !community.DAOPrivate.Members.HasRole(dave.String(), "member") {
		t.Fatalf("expected dave to have member role")
	}
	daokit.InstantExecute(community.DAO, testReq(NewRemoveMemberAction(carol.String())))
	if len(community.DAOPrivate.Members.GetMembers()) != 3 {
		t.Fatalf("expected 3 members, got %d", len(community.DAOPrivate.Members.GetMembers()))
	}
	if community.DAOPrivate.Members.HasRole(carol.String(), "member") {
		t.Fatalf("expected carol to not have member role")
	}
}

func TestAddEvent(t *testing.T) {
	profile := &mockprofile.MockProfile{}
	testing.SetContext(testing.Context{
		CurrentRealm: testing.NewUserRealm(alice),
	})
	testing.SetRealm(testing.NewCodeRealm("gno.land/r/zenao/communities/c1"))
	conf := Config{
		ZenaoAdminAddr:   testUsers["zenaoadm"].String(),
		Administrators:   []string{alice.String()},
		Members:          []string{carol.String(), dave.String()},
		Events:           []string{},
		DisplayName:      "Community Name",
		Description:      "this is a community",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
	}
	community := NewCommunity(&conf)
	if len(community.DAOPrivate.Members.GetMembers()) != 4 {
		t.Fatalf("expected 4 members, got %d", len(community.DAOPrivate.Members.GetMembers()))
	}
	if !community.DAOPrivate.Members.HasRole(carol.String(), "member") {
		t.Fatalf("expected carol to have member role")
	}
	if !community.DAOPrivate.Members.HasRole(dave.String(), "member") {
		t.Fatalf("expected dave to have member role")
	}
	if community.DAOPrivate.Members.CountMembersWithRole("event") != 0 {
		t.Fatalf("expected 0 events, got %d", community.DAOPrivate.Members.CountMembersWithRole("event"))
	}
	event := testutils.TestAddress("event1")
	daokit.InstantExecute(community.DAO, testReq(NewAddEventAction(event.String())))
	if community.DAOPrivate.Members.CountMembersWithRole("event") != 1 {
		t.Fatalf("expected 1 event, got %d", community.DAOPrivate.Members.CountMembersWithRole("event"))
	}
	if !community.DAOPrivate.Members.HasRole(event.String(), "event") {
		t.Fatalf("expected event to have event role")
	}
}

func TestRemoveEvent(t *testing.T) {
	profile := &mockprofile.MockProfile{}
	testing.SetContext(testing.Context{
		CurrentRealm: testing.NewUserRealm(alice),
	})
	testing.SetRealm(testing.NewCodeRealm("gno.land/r/zenao/communities/c1"))
	conf := Config{
		ZenaoAdminAddr:   testUsers["zenaoadm"].String(),
		Administrators:   []string{alice.String()},
		Members:          []string{carol.String(), dave.String()},
		Events:           []string{},
		DisplayName:      "Community Name",
		Description:      "this is a community",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
	}
	community := NewCommunity(&conf)
	if len(community.DAOPrivate.Members.GetMembers()) != 4 {
		t.Fatalf("expected 4 members, got %d", len(community.DAOPrivate.Members.GetMembers()))
	}
	event := testutils.TestAddress("event1")
	daokit.InstantExecute(community.DAO, testReq(NewAddEventAction(event.String())))
	if community.DAOPrivate.Members.CountMembersWithRole("event") != 1 {
		t.Fatalf("expected 1 event, got %d", community.DAOPrivate.Members.CountMembersWithRole("event"))
	}
	if !community.DAOPrivate.Members.HasRole(event.String(), "event") {
		t.Fatalf("expected event to have event role")
	}
	daokit.InstantExecute(community.DAO, testReq(NewRemoveEventAction(event.String())))
	if community.DAOPrivate.Members.CountMembersWithRole("event") != 0 {
		t.Fatalf("expected 0 events, got %d", community.DAOPrivate.Members.CountMembersWithRole("event"))
	}
	if community.DAOPrivate.Members.HasRole(event.String(), "event") {
		t.Fatalf("expected event to not have event role")
	}
}

func testReq(msg daokit.Action) daokit.ProposalRequest {
	return daokit.ProposalRequest{
		Action: msg,
	}
}
