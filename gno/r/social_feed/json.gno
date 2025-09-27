package social_feed

import (
	"gno.land/p/onbloc/json"
	feedsv1 "gno.land/p/zenao/feeds/v1"
)

func postViewsToJSON(posts []*feedsv1.PostView) string {
	nodes := []*json.Node{}
	for _, post := range posts {
		nodes = append(nodes, post.ToJSON())
	}
	nodeArray := json.ArrayNode("", nodes)
	bz, err := json.Marshal(nodeArray)
	if err != nil {
		panic(err)
	}
	return string(bz)
}

func postViewToJSON(post *feedsv1.PostView) string {
	node := post.ToJSON()
	bz, err := json.Marshal(node)
	if err != nil {
		panic(err)
	}
	return string(bz)
}
