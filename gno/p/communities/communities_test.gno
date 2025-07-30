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
)

func TestNewCommunity(t *testing.T) {
	var profile mockProfile
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/events/e1"))
	conf := Config{
		Administrators:   []string{alice.String(), bob.String()},
		Members:          []string{carol.String(), dave.String(), eve.String()},
		Events:           []string{},
		DisplayName:      "Community Name",
		Description:      "this is a community",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
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
