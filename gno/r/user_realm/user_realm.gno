package user_realm

import (
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
