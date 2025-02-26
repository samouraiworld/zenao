package social_feed

import (
	"std"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/seqid"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

var (
	id    seqid.ID
	posts *avl.Tree // local_post_id -> Post
)

func init() {
	posts = avl.NewTree()
}

func NewPost(feedId string, post zenaov1.Post) string {
	feedRaw, ok := feeds.Get(feedId)
	if ok {
		feed := feedRaw.(*Feed)
		if !feed.authFunc(std.PreviousRealm().Address().String()) {
			panic("this is a private feed and you are not authorized to post on it")
		}
	}
	postID := feedId + ":" + id.Next().String()
	posts.Set(feedId, post)
	return postID
}
