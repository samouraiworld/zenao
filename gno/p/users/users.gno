package users

import (
	"std"

	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/role_manager"
)

type User struct {
	org *basedao.DAO
}

type Config struct {
	Name             string
	Description      string
	ZenaoAdminAddr   string
	GetProfileString GetProfileString
	SetProfileString SetProfileString
}

type GetProfileString func(addr std.Address, field string, def string) string
type SetProfileString func(field string, value string) bool

func NewUser(conf *Config) *User {
	roles := []role_manager.RoleInfo{
		{
			Name:        "admin",
			Description: "admin role",
		},
	}
	members := []basedao.Member{
		{
			Address: conf.ZenaoAdminAddr,
			Roles:   []string{"admin"},
		},
	}

	// Don't pass the message handlers, since they are by default in the user dao
	dao := basedao.New(&basedao.Config{
		Name:              conf.Name,
		Description:       conf.Description,
		NoDefaultHandlers: false,
		Members:           basedao.NewMembersStore(roles, members),
		SetProfileString:  basedao.ProfileStringSetter(conf.SetProfileString),
		GetProfileString:  basedao.ProfileStringGetter(conf.GetProfileString),
		NoEvents:          true,
	})

	user := &User{
		org: dao,
	}

	return user
}

func (u *User) TransferOwnership(newOwner string) {
	caller := std.PrevRealm().Addr()
	proposalReqAddMember := daokit.ProposalRequest{
		Title:       "add member with admin role",
		Description: "no description",
		Message: basedao.NewAddMemberMsg(&basedao.MsgAddMember{
			Address: std.Address(newOwner),
			Roles:   []string{"admin"},
		}),
	}
	proposalReqRemoveMember := daokit.ProposalRequest{
		Title:       "remove member",
		Description: "no description",
		Message:     basedao.NewRemoveMemberMsg(caller),
	}
	u.org.InstantExecute(proposalReqAddMember)
	u.org.InstantExecute(proposalReqRemoveMember)
}

func (u *User) IsOwner() bool {
	caller := std.PrevRealm().Addr().String()
	return u.org.Members.HasRole(caller, "admin")
}
