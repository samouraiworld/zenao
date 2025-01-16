package users

import (
	"std"

	"gno.land/p/zenao/dao_roles_based"
)

// a user is "dao" contract with special properties
// 1. the "user" dao have one member that is the user that deploy the contract
// 2. the "user" dao have a "role" admin that is the role of the user
// 3. the "user" dao have one message handler to replace the user and give ownership to another user
// 4. the user realm extend the "dao" realm by adding a username, id, description & picture

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
	}

	conditions := make(map[string]string)
	conditions[handlerTypes[0]] = `"condition":{"type":"role-count","role":"admin","count":"1"}`
	conditions[handlerTypes[1]] = `"condition":{"type":"role-count","role":"admin","count":"1"}`

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
	// example of proposal: {"title":"add member with admin role,"description":"","message":{"type":"gno.land/r/teritori/social_feeds.CreatePost","payload":{"feedId":"1","parentId":"0","category":"2","metadata":""}}}
	proposalAddMemberJSON := `{"title":"add member with admin role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + newOwner + `","roles":["admin"]}}}`
	proposalRemoveMemberJSON := `{"title":"remove member","description":"no description","message":{"type":"` + typeRemoveMember + `","payload":{"address":"` + caller + `"}}}`

	u.user.InstantExecute(proposalAddMemberJSON)
	panic(proposalAddMemberJSON)
	u.user.InstantExecute(proposalRemoveMemberJSON)
}
