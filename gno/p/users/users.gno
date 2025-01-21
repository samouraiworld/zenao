package users

import (
	"std"

	"gno.land/p/zenao/dao_roles_based"
)

type User struct {
	org *dao_roles_based.DaoRolesBased // don't export to limit the access to all dao methods
}

func NewUser(id string) *User {
	caller := std.PrevRealm().Addr().String()
	roles := []string{"admin"}
	members := [][]string{
		{caller, "admin"},
	}

	var resourcesJSON = `[{"resource":"init","condition":{"type":"role-count","role":"admin","count":"1"}}]`

	// Don't pass the message handlers, since they are by default in the user dao
	dao := dao_roles_based.NewDaoRolesBasedJSON(id, "zenao dao user", roles, members, resourcesJSON, []dao_roles_based.MessageHandler{})
	user := &User{
		org: dao,
	}

	return user
}

func (u *User) TransferOwnership(newOwner string) {
	caller := std.PrevRealm().Addr().String()

	typeAddMember := dao_roles_based.NewAddNewMemberMessageHandler(nil).Type()
	typeRemoveMember := dao_roles_based.NewRemoveMemberMessageHandler(nil).Type()

	proposalAddMemberJSON := `{"title":"add member with admin role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + newOwner + `","roles":["admin"]}}}`
	proposalRemoveMemberJSON := `{"title":"remove member","description":"no description","message":{"type":"` + typeRemoveMember + `","payload":{"address":"` + caller + `"}}}`

	u.org.InstantExecute(proposalAddMemberJSON)
	u.org.InstantExecute(proposalRemoveMemberJSON)
}
