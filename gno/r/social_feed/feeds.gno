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

	reactions *avl.Tree

	posts      *avl.Tree // feed_id:local_post_id -> *Post // for search with specific feed
	postsByTag *avl.Tree // feed_id:tag:local_post_id -> *Post // for search with specific tag
	postsById  *avl.Tree // id -> *Post // for search with specific id (get/delete)

	feeds *avl.Tree // slug -> Feed
)

func init() {
	reactions = avl.NewTree()

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
	tagsSplit := []string{}
	if tags != "" {
		tagsSplit = strings.Split(tags, ",")
	}

	//XXX: Should we skip deleted posts ?
	if len(tagsSplit) == 0 {
		start := feedId + ":"
		end := feedId + ";"
		posts.Iterate(start, end, func(key string, value interface{}) bool {
			if i >= int(offset) {
				post := value.(*feedsv1.Post)
				postView := &feedsv1.PostView{
					Post:      post,
					Reactions: GetPostReactions(post.LocalPostId, user),
				}
				res = append(res, postView)
			}
			i++
			return i >= int(offset+limit)
		})
		return res
	}

	firstTag := tagsSplit[0]
	tagStart := feedId + ":" + firstTag + ":"
	tagEnd := feedId + ":" + firstTag + ";"
	postsByTag.Iterate(tagStart, tagEnd, func(key string, value interface{}) bool {
		if i >= int(offset) {
			post := value.(*feedsv1.Post)
			hasAllTags := true
			for _, tag := range tagsSplit[1:] {
				tagKey := feedId + ":" + tag + ":" + post.LocalPostId
				if !postsByTag.Has(tagKey) {
					hasAllTags = false
					break
				}
			}

			if hasAllTags {
				postView := &feedsv1.PostView{
					Post:      post,
					Reactions: GetPostReactions(post.LocalPostId, user),
				}
				res = append(res, postView)
				i++
			}
		} else {
			i++
		}
		return i >= int(offset+limit)
	})
	return res
}
