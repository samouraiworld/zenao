package user_demo

import (
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/users"
	"gno.land/r/demo/profile"
)

var (
	DAO      daokit.DAO
	localDAO daokit.DAO

	user *users.User // XXX: needed for backward compatibility with frontend queries
)

func init() {
	user = users.NewUser(&users.Config{
		Name:             "user",
		Bio:              "this is a user",
		AvatarURI:        "",
		GetProfileString: profile.GetStringField,
		SetProfileString: profile.SetStringField,
		ZenaoAdminAddr:   "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94",
		CrossFn:          crossFn,
		SetImplemFn:      setImplem,
		PrivateVarName:   "user",
	})
	setImplem(user.DAO)
}

func Vote(_ realm, proposalID uint64, vote daocond.Vote) {
	localDAO.Vote(proposalID, vote)
}

func Execute(_ realm, proposalID uint64) {
	localDAO.Execute(proposalID)
}

func Render(path string) string {
	return localDAO.Render(path)
}

func crossFn(_ realm, cb func()) {
	cb()
}

func setImplem(dao daokit.DAO) {
	localDAO = dao
	DAO = daokit.NewCrossing(dao, crossFn)
}
