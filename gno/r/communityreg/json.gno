package communityreg

import (
	"gno.land/p/onbloc/json"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

func communitiesToJSON(communities []*zenaov1.CommunityInfo) string {
	nodes := []*json.Node{}
	for _, community := range communities {
		obj := community.ToJSON()
		obj.AppendObject("pkgPath", json.StringNode("", community.PkgPath))
		nodes = append(nodes, obj)
	}
	arr := json.ArrayNode("", nodes)
	bz, err := json.Marshal(arr)
	if err != nil {
		panic(err)
	}
	return string(bz)
}
