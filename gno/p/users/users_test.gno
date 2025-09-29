package users

import (
	"testing"

	"gno.land/p/nt/testutils"
	"gno.land/r/zenao/mockprofile"
)

var (
	profile = &mockprofile.MockProfile{}
	alice   = testutils.TestAddress("alice")
	bob     = testutils.TestAddress("bob")
	config  = Config{
		Name:             "user",
		Bio:              "this is a user",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetProfileString,
		ZenaoAdminAddr:   alice.String(),
	}
)

func TestNewUser(t *testing.T) {
	testing.SetOriginCaller(alice)
	testing.SetRealm(testing.NewCodeRealm("gno.land/r/zenao/users/u1"))
	user := NewUser(&config)
	if user.DAOPrivate.Members.GetMembers()[0] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), user.DAOPrivate.Members.GetMembers()[0])
	}
	if !user.DAOPrivate.Members.HasRole(alice.String(), "zenao-admin") {
		t.Fatalf("expected user to have admin role")
	}
}
