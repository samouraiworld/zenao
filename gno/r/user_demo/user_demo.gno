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
		ZenaoAdminAddr:   std.PreviousRealm().Address().String(),
	}
	user = users.NewUser(&config)
}

func Render(path string) string {
	s := md.H1(profile.GetStringField(std.CurrentRealm().Address(), profile.DisplayName, ""))
	s += md.Image("User avatar", profile.GetStringField(std.CurrentRealm().Address(), profile.Avatar, ""))
	s += md.Paragraph(profile.GetStringField(std.CurrentRealm().Address(), profile.Bio, ""))
	return s
}
