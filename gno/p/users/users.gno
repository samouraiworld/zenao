package users

import (
	"std"

	"gno.land/p/zenao/dao_roles_based"
)

type User struct {
	user *dao_roles_based.DaoRolesBased // don't export to limit the access to all dao methods
}

func NewUser(id, username string) *User {
	caller := std.PrevRealm().Addr().String()
	roles := []string{"admin"}
	members := [][]string{
		{caller, "admin"},
	}

	handlerTypes := []string{
		dao_roles_based.NewAddNewMemberMessageHandler(nil).Type(),
		dao_roles_based.NewRemoveMemberMessageHandler(nil).Type(),
		"init",
	}

	conditions := make(map[string]string)
	conditions[handlerTypes[0]] = `"condition":{"type":"role-count","role":"admin","count":"1"}`
	conditions[handlerTypes[1]] = `"condition":{"type":"role-count","role":"admin","count":"1"}`
	conditions["init"] = `"condition":{"type":"role-count","role":"admin","count":"1"}`

	var resourcesJSON = `[`
	for i, hType := range handlerTypes {
		resourcesJSON += `{"resource":"` + hType + `",` + conditions[hType] + `}`
		if i < len(handlerTypes)-1 {
			resourcesJSON += `,`
		}
	}
	resourcesJSON += `]`

	// Don't pass the message handlers, since they are by default in the user dao
	dao := dao_roles_based.NewDaoRolesBasedJSON(id, username, roles, members, resourcesJSON, []dao_roles_based.MessageHandler{})
	user := &User{
		user: dao,
	}

	return user
}

func (u *User) TransferOwnership(newOwner string) {
	caller := std.PrevRealm().Addr().String()

	typeAddMember := dao_roles_based.NewAddNewMemberMessageHandler(nil).Type()
	typeRemoveMember := dao_roles_based.NewRemoveMemberMessageHandler(nil).Type()

	proposalAddMemberJSON := `{"title":"add member with admin role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + newOwner + `","roles":["admin"]}}}`
	proposalRemoveMemberJSON := `{"title":"remove member","description":"no description","message":{"type":"` + typeRemoveMember + `","payload":{"address":"` + caller + `"}}}`

	u.user.InstantExecute(proposalAddMemberJSON)
	u.user.InstantExecute(proposalRemoveMemberJSON)
}
