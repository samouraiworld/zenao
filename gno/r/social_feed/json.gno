package social_feed

import "gno.land/p/demo/json"

func GetFeedPostsJSON(feedId string, offset uint32, limit uint32, user string) string {
	posts := GetFeedPosts(feedId, offset, limit, user)
	nodes := []*json.Node{}
	for _, post := range posts {
		nodes = append(nodes, post.ToJSON())
	}
	bz, err := json.Marshal(nodes)
	if err != nil {
		panic(err)
	}
	return string(bz)
}
