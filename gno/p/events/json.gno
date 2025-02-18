package events

import (
	"gno.land/p/demo/json"
)

func (e *Event) GetUserRolesJSON(addr string) string {
	userRoles := e.Org.Members.GetMemberRoles(addr)
	nodes := make([]*json.Node, 0, len(userRoles))
	for _, role := range userRoles {
		nodes = append(nodes, json.StringNode("", role))
	}
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
