package eventreg

import (
	"gno.land/p/demo/json"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

func eventsToJSON(events []*zenaov1.EventInfo) string {
	nodes := []*json.Node{}
	for _, evt := range events {
		obj := evt.ToJSON()
		obj.AppendObject("pkgPath", json.StringNode("", evt.PkgPath))
		nodes = append(nodes, obj)
	}
	arr := json.ArrayNode("", nodes)
	bz, err := json.Marshal(arr)
	if err != nil {
		panic(err)
	}
	return string(bz)
}

func stringArrayToJSON(arr []string) string {
	nodes := []*json.Node{}
	for _, str := range arr {
		nodes = append(nodes, json.StringNode("", str))
	}
	jsonArr := json.ArrayNode("", nodes)
	bz, err := json.Marshal(jsonArr)
	if err != nil {
		panic(err)
	}
	return string(bz)
}
