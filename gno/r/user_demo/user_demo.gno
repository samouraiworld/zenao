package user_demo

import (
	"std"

	"gno.land/p/moul/md"
	"gno.land/p/zenao/users"
	"gno.land/r/demo/profile"
)

var user *users.User

func init() {
	config := users.Config{
		Name:             "user",
		Bio:              "this is a user",
		SetProfileString: profile.SetStringField,
		GetProfileString: profile.GetStringField,
		ZenaoAdminAddr:   std.PrevRealm().Addr().String(),
	}
	user = users.NewUser(&config)
}

func TransferOwnership(newOwner string) {
	user.TransferOwnership(newOwner)
}

// Use proposals instead
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
