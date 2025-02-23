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
	std.TestSetOrigCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/users/u1"))
	user := NewUser(&config)
	if user.org.Members.GetMembers()[0] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), user.org.Members.GetMembers()[0])
	}
	if !user.org.Members.HasRole(alice.String(), "admin") {
		t.Fatalf("expected user to have admin role")
	}
}

func TestTransferOwnership(t *testing.T) {
	std.TestSetOrigCaller(alice)
	std.TestSetRealm(std.NewCodeRealm("gno.land/r/zenao/users/u1"))
	user := NewUser(&config)
	std.TestSetOrigCaller(bob)
	defer func() {
		if r := recover(); r == nil {
			t.Fatalf("expected panic, bob is not the owner")
		}
	}()
	user.TransferOwnership(bob.String())
	std.TestSetOrigCaller(alice)
	user.TransferOwnership(bob.String())
	if user.org.Members.GetMembers()[0] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), user.org.Members.GetMembers()[0])
	}
	if user.org.Members.IsMember(alice.String()) {
		t.Fatalf("expected alice to not be a member")
	}
	if !user.org.Members.HasRole(bob.String(), "admin") {
		t.Fatalf("expected bob to have admin role")
	}
}

func mockGetProfileString(addr std.Address, field string, def string) string {
	return ""
}

func mockSetProfileString(field string, value string) bool {
	return true
}
