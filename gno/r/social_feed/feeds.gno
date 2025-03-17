package social_feed

import (
	"std"
	"strings"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/seqid"

	feedsv1 "gno.land/p/zenao/feeds/v1"
)

type Feed struct {
	crossNetwork bool
	authFunc     func(string) bool // func(address) -> bool
}

var (
	id seqid.ID

	reactions     *avl.Tree // post_id:icon -> count
	userReactions *avl.Tree // post_id:icon:user_address -> struct{}

	posts      *avl.Tree // feed_id:timestamp:local_post_id -> *Post // for search with specific feed sorted by timestamp
	postsByTag *avl.Tree // feed_id:tag:timestamp:local_post_id -> *Post // for search with specific tag sorted by timestamp
	postsById  *avl.Tree // id -> *Post // for search with specific id

	feeds *avl.Tree // slug -> Feed
)

func init() {
	reactions = avl.NewTree()
	userReactions = avl.NewTree()

	posts = avl.NewTree()
	postsByTag = avl.NewTree()
	postsById = avl.NewTree()

	feeds = avl.NewTree()
}

func NewFeed(slug string, crossNetwork bool, authFunc func(string) bool) string {
	creator := std.PreviousRealm()
	if crossNetwork && authFunc != nil {
		panic("crossNetwork feeds cannot have an authFunc")
	}

	feed := &Feed{
		crossNetwork: crossNetwork,
		authFunc:     authFunc,
	}
	feedId := creator.Address().String() + ":" + slug
	if feeds.Has(feedId) {
		panic("feed already exists")
	}
	feeds.Set(feedId, feed)
	return feedId
}

// XXX: do a registry by user & one by parentID ?
// XXX: handle flagged posts
// XXX: handle tags with an array of string
func GetFeedPosts(feedId string, offset uint32, limit uint32, tags string, user string) []*feedsv1.PostView {
	if feedId == "" {
		panic("feedId is empty")
	}
	var res []*feedsv1.PostView
	i := 0
	start := feedId + ":"
	end := feedId + ";"
	tagsSplit := []string{}
	if tags != "" {
		tagsSplit = strings.Split(tags, ",")
	}
	posts.Iterate(start, end, func(key string, value interface{}) bool {
		post := value.(*feedsv1.Post)
		for _, tag := range tagsSplit {
			if !hasTag(post.Tags, tag) {
				return false
			}
		}
		if i >= int(offset) {
			postView := &feedsv1.PostView{
				Post:      post,
				Reactions: GetPostReactions(key, user),
			}
			res = append(res, postView)
		}
		i++
		if i >= int(offset+limit) {
			return true
		}
		return false
	})
	return res
}

func hasTag(tags []string, tag string) bool {
	for _, t := range tags {
		if t == tag {
			return true
		}
	}
	return false
}
