package communities

import (
	"std"
	"testing"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/testutils"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
	carol = testutils.TestAddress("carol")
	dave  = testutils.TestAddress("dave")
	eve   = testutils.TestAddress("eve")
	henry = testutils.TestAddress("henry")
)

func TestNewCommunity(t *testing.T) {
	var profile mockProfile
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := Config{
		Creator:          alice.String(),
		Administrators:   []string{eve.String(), henry.String()},
		Members:          []string{bob.String(), carol.String()},
		Events:           []string{dave.String()},
		DisplayName:      "Community Name",
		Description:      "this is a community",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
	}
	community := NewCommunity(&conf)
	if len(community.DAOPrivate.Members.GetMembers()) != 7 {
		t.Fatalf("expected 7 members, got %d", len(community.DAOPrivate.Members.GetMembers()))
	}
	// the creator also get the administrator role
	if community.DAOPrivate.Members.CountMembersWithRole("administrator") != 3 {
		t.Fatalf("expected 3 administrators, got %d", community.DAOPrivate.Members.CountMembersWithRole("administrator"))
	}
	if community.DAOPrivate.Members.CountMembersWithRole("member") != 2 {
		t.Fatalf("expected 2 members, got %d", community.DAOPrivate.Members.CountMembersWithRole("member"))
	}
	if community.DAOPrivate.Members.CountMembersWithRole("event") != 1 {
		t.Fatalf("expected 1 event, got %d", community.DAOPrivate.Members.CountMembersWithRole("event"))
	}
	if !community.DAOPrivate.Members.HasRole(alice.String(), "creator") {
		t.Fatalf("expected user to have creator role")
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
