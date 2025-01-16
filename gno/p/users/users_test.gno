package users

import (
	"std"
	"testing"

	"gno.land/p/demo/testutils"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
)

func TestNewUser(t *testing.T) {
	std.TestSetOrigCaller(alice)
	user := NewUser("userid01", "Alice")
	if user.user.MemberModule.GetMembers()[0] != alice.String() {
		t.Fatalf("expected %s, got %s", alice.String(), user.user.MemberModule.GetMembers()[0])
	}
	if !user.user.HasRole(alice.String(), "admin") {
		t.Fatalf("expected user to have admin role")
	}
}

func TestTransferOwnership(t *testing.T) {
	std.TestSetOrigCaller(alice)
	user := NewUser("userid01", "Alice")
	std.TestSetOrigCaller(bob)
	defer func() {
		if r := recover(); r == nil {
			t.Fatalf("expected panic, bob is not the owner")
		}
	}()
	user.TransferOwnership(bob.String())
	std.TestSetOrigCaller(alice)
	user.TransferOwnership(bob.String())
	if user.user.MemberModule.GetMembers()[0] != bob.String() {
		t.Fatalf("expected %s, got %s", bob.String(), user.user.MemberModule.GetMembers()[0])
	}
	if user.user.IsMember(alice.String()) {
		t.Fatalf("expected alice to not be a member")
	}
}
