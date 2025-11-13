package user_demo

import (
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/users"
	"gno.land/r/demo/profile"
	pactions "gno.land/r/zenao/polls/actions/v1"
	sfactions "gno.land/r/zenao/social_feed/actions/v1"
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

	adminVetoCond := daocond.RoleCount(1, "zenao-admin", user.DAOPrivate.Members.HasRole)
	resources := []struct {
		cond     daocond.Condition
		handlers []daokit.ActionHandler
	}{{
		cond: adminVetoCond,
		handlers: []daokit.ActionHandler{
			sfactions.ActionNewPostHandler(),
			sfactions.ActionEditPostHandler(),
			sfactions.ActionDeletePostHandler(),
			sfactions.ActionReactPostHandler(),
			pactions.ActionNewPollHandler(),
			pactions.ActionVotePollHandler(),
		},
	}}

	for _, res := range resources {
		for _, h := range res.handlers {
			user.DAOPrivate.Core.Resources.Set(&daokit.Resource{
				Handler:   h,
				Condition: res.cond,
			})
		}
	}
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

func setImplem(newLocalDAO daokit.DAO, newDAO daokit.DAO) {
	localDAO, DAO = newLocalDAO, newDAO
}
