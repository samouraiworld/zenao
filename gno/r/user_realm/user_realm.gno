package user_realm

import (
	"std"

	"gno.land/p/moul/md"
	"gno.land/p/zenao/users"
	"gno.land/r/demo/profile"
)

var user *users.User

func init() {
	user = users.NewUser()

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
	s += md.Image("User avatar", profile.GetStringField(std.CurrentRealm().Addr(), profile.Avatar, ""))
	s += md.Paragraph(profile.GetStringField(std.CurrentRealm().Addr(), profile.Bio, ""))
	return s
}
