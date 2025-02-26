package social_feed

import (
	"std"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/seqid"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

type Feed struct {
	crossNetwork bool
	authFunc     func(string) bool // func(address) -> bool
}

var (
	id    seqid.ID
	posts *avl.Tree // local_post_id -> Post
	feeds *avl.Tree // slug -> Feed
)

func init() {
	posts = avl.NewTree()
	feeds = avl.NewTree()
}

func NewFeed(slug string, crossNetwork bool, authFunc func(string) bool) string {
	creator := std.PreviousRealm()
	feed := &Feed{
		crossNetwork: crossNetwork,
		authFunc:     authFunc,
	}
	feedId := creator.Address().String() + ":" + slug
	feeds.Set(feedId, feed)
	return feedId
}

// XXX: do a registry by user & one by parentID ?
// XXX: handle flagged posts
func GetFeedPosts(feedId string, offset uint32, limit uint32) []*zenaov1.Post {
	if feedId == "" {
		panic("feedId is empty")
	}
	var res []*zenaov1.Post
	i := 0
	posts.Iterate(feedId, "", func(key string, value interface{}) bool {
		// XXX: implement offset & limit
		post := value.(*zenaov1.Post)
		if i >= int(offset) {
			res = append(res, post)
		}
		i++
		return true
	})
	return res
}
