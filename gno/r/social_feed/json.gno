package social_feed

import (
	"gno.land/p/demo/json"
	feedsv1 "gno.land/p/zenao/feeds/v1"
)

// XXX: TODO use array of string for tags
func ViewPostsToJSON(posts []*feedsv1.PostView) string {
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
