package events

import (
	"gno.land/p/demo/json"
	"gno.land/p/demo/ufmt"
)

func (inf *Info) ToJSON() *json.Node {
	return json.ObjectNode("", map[string]*json.Node{
		"title":        json.StringNode("", inf.Title),
		"description":  json.StringNode("", inf.Description),
		"imageUri":     json.StringNode("", inf.ImageURI),
		"startDate":    json.StringNode("", ufmt.Sprintf("%d", inf.StartDate)),
		"endDate":      json.StringNode("", ufmt.Sprintf("%d", inf.EndDate)),
		"capacity":     json.NumberNode("", float64(inf.Capacity)),
		"creatorAddr":  json.StringNode("", inf.Creator),
		"location":     json.StringNode("", inf.Location),
		"participants": json.NumberNode("", float64(inf.Participants)),
	})
}

func (e *Event) GetUserRolesJSON(addr string) string {
	userRoles := e.Org.MemberModule.GetMemberRoles(addr)
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
