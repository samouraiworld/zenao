package users

import (
	"std"
	"testing"

	"gno.land/p/demo/testutils"
)

var (
	alice  = testutils.TestAddress("alice")
	bob    = testutils.TestAddress("bob")
	config = Config{
		Name:             "user",
		Bio:              "this is a user",
		SetProfileString: mockSetProfileString,
		GetProfileString: mockGetProfileString,
		ZenaoAdminAddr:   alice.String(),
	}
)

func TestNewUser(t *testing.T) {
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/users/u1"))
	user := NewUser(&config)
	if user.DAOPrivate.Members.GetMembers()[0] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), user.DAOPrivate.Members.GetMembers()[0])
	}
	if !user.DAOPrivate.Members.HasRole(alice.String(), "zenao-admin") {
		t.Fatalf("expected user to have admin role")
	}
}

func mockGetProfileString(addr std.Address, field string, def string) string {
	return ""
}

func mockSetProfileString(field string, value string) bool {
	return true
}
