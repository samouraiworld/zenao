package communities

import (
	"gno.land/p/demo/json"
)

func (c *Community) GetMembersWithRoleJSON(role string) string {
	users := c.DAOPrivate.Members.GetMembersWithRole(role)
	nodes := make([]*json.Node, 0, len(users))
	for _, user := range users {
		nodes = append(nodes, json.StringNode("", user))
	}
	return mustMarshalString(json.ArrayNode("", nodes))
}

func (c *Community) GetInfoJSON() string {
	return mustMarshalString(c.Info().ToJSON())
}

func mustMarshalString(node *json.Node) string {
	bz, err := json.Marshal(node)
	if err != nil {
		panic(err)
	}
	return string(bz)
}
