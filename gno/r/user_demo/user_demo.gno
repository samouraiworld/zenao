package user_demo

import (
	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/users"
	"gno.land/r/demo/profile"
)

var (
	DAO        daokit.DAO
	daoPrivate *basedao.DAOPrivate
	user       *users.User
)

func init() {
	user = users.NewUser(&users.Config{
		Name:             "user",
		Bio:              "this is a user",
		AvatarURI:        "",
		GetProfileString: profile.GetStringField,
		SetProfileString: profile.SetStringField,
		ZenaoAdminAddr:   "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94",
	})
	DAO = daokit.NewCrossing(user.DAO, func(_ realm, cb func()) { cb() })
	daoPrivate = user.DAOPrivate
}

func Vote(proposalID uint64, vote daocond.Vote) {
	DAO.Vote(proposalID, vote)
}

func Execute(proposalID uint64) {
	DAO.Execute(proposalID)
}

func Render(path string) string {
	return user.Render(path)
}
