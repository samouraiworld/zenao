package user_realm

import (
	"std"

	"gno.land/p/moul/md"
	"gno.land/p/zenao/users"
	"gno.land/r/demo/profile"
)

var user *users.User

func init() {
	user = users.NewUser("123e4567-e89b-12d3-a456-426614174000")

	profile.SetStringField(profile.DisplayName, "User 1")
	profile.SetStringField(profile.Bio, "This is a user")
	profile.SetStringField(profile.Avatar, "")
}

func TransferOwnership(newOwner string) {
	user.TransferOwnership(newOwner)
}

func EditUser(displayName, bio, avatar string) {
	if !user.IsOwner() {
		panic("caller is not owner/admin of the user realm")
	}
	profile.SetStringField(profile.DisplayName, displayName)
	profile.SetStringField(profile.Bio, bio)
	profile.SetStringField(profile.Avatar, avatar)
}

func Render(path string) string {
	s := md.H1(profile.GetStringField(std.CurrentRealm().Addr(), profile.DisplayName, ""))
	s += md.HorizontalRule()
	return s
}
