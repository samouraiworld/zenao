package events

import (
	"gno.land/p/demo/avl"
	"gno.land/p/demo/json"
)

func (e *Event) GetUserRolesJSON(addr string) string {
	userRoles := e.DAOPrivate.Members.GetMemberRoles(addr)
	nodes := make([]*json.Node, 0, len(userRoles))
	for _, role := range userRoles {
		nodes = append(nodes, json.StringNode("", role))
	}
	return mustMarshalString(json.ArrayNode("", nodes))
}

func (e *Event) GetUsersWithRoleJSON(role string) string {
	users := e.DAOPrivate.Members.GetMembersWithRole(role)
	nodes := make([]*json.Node, 0, len(users))
	for _, user := range users {
		nodes = append(nodes, json.StringNode("", user))
	}
	return mustMarshalString(json.ArrayNode("", nodes))
}

// TODO: use basedao.Memberstore methods once synced with daokit latest version
func (e *Event) GetUsersWithRolesJSON(roles []string) string {
	userRolesMap := avl.NewTree() // address -> []role
	for _, role := range roles {
		users := e.DAOPrivate.Members.GetMembersWithRole(role)
		for _, user := range users {
			val, ok := userRolesMap.Get(user)
			if !ok {
				val = []string{}
			}
			val = append(val.([]string), role)
			userRolesMap.Set(user, val)
		}
	}
	nodes := make([]*json.Node, 0, userRolesMap.Size())
	userRolesMap.Iterate("", "", func(key string, value interface{}) bool {
		roles := value.([]string)
		roleNodes := make([]*json.Node, 0, len(roles))
		for _, role := range roles {
			roleNodes = append(roleNodes, json.StringNode("", role))
		}
		nodes = append(nodes, json.ObjectNode("", map[string]*json.Node{
			"address": json.StringNode("", key),
			"roles":   json.ArrayNode("", roleNodes),
		}))
		return false
	})
	return mustMarshalString(json.ArrayNode("", nodes))
}

func (e *Event) GetInfoJSON() string {
	return mustMarshalString(e.Info().ToJSON())
}

func mustMarshalString(node *json.Node) string {
	bz, err := json.Marshal(node)
	if err != nil {
		panic(err)
	}
	return string(bz)
}
