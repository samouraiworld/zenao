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

	posts       *avl.Tree // local_post_id -> *Post // for search with specific id (get/delete)
	postsByFeed *avl.Tree // feed_id:local_post_id -> *Post // for search with feed id (iterate)

	// XXX: add feed index into the composite key to ensure reply are in the same feed ?
	postsByParent *avl.Tree // parent_id:local_post_id -> *Post // for search with parent_id
	feeds         *avl.Tree // slug -> Feed
)

func init() {
	reactions = avl.NewTree()
	userReactions = avl.NewTree()

	posts = avl.NewTree()
	postsByFeed = avl.NewTree()
	postsByParent = avl.NewTree()
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

// XXX: do a registry by user ?
// XXX: handle flagged posts
// XXX: handle tags with an array of string
// XXX: optimize research by tags with a new tree ?
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
	postsByFeed.ReverseIterate(start, end, func(key string, value interface{}) bool {
		post := value.(*feedsv1.Post)
		for _, tag := range tagsSplit {
			if !hasTag(post.Tags, tag) {
				return false
			}
		}
		if post.ParentUri == "" {
			return false
		}
		if i >= int(offset) {
			postView := &feedsv1.PostView{
				Post:          post,
				ChildrenCount: CountChildren(post.LocalPostId),
				Reactions:     GetPostReactions(post.LocalPostId, user),
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

// XXX: merge with above function (deduct from param the tree to use) ?
func GetChildrenPosts(parentId string, offset uint32, limit uint32, tags string, user string) []*feedsv1.PostView {
	if parentId == "" {
		panic("parentId is empty")
	}
	var res []*feedsv1.PostView
	i := 0
	start := parentId + ":"
	end := parentId + ";"
	tagsSplit := []string{}
	if tags != "" {
		tagsSplit = strings.Split(tags, ",")
	}
	postsByParent.ReverseIterate(start, end, func(key string, value interface{}) bool {
		post := value.(*feedsv1.Post)
		for _, tag := range tagsSplit {
			if !hasTag(post.Tags, tag) {
				return false
			}
		}
		if i >= int(offset) {
			postView := &feedsv1.PostView{
				Post:          post,
				ChildrenCount: CountChildren(post.LocalPostId),
				Reactions:     GetPostReactions(post.LocalPostId, user),
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

func CountChildren(parentId uint64) uint64 {
	count := uint64(0)
	parentIdStr := seqid.ID(parentId).String()
	postsByParent.ReverseIterate(parentIdStr+":", parentIdStr+";", func(key string, value interface{}) bool {
		count++
		return false
	})
	return count
}

func hasTag(tags []string, tag string) bool {
	for _, t := range tags {
		if t == tag {
			return true
		}
	}
	return false
}
