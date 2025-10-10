package social_feed

import (
	"strconv"
	"time"

	"gno.land/p/nt/seqid"

	feedsv1 "gno.land/p/zenao/feeds/v1"
	"gno.land/p/zenao/realmid"
)

func NewPost(_ realm, feedId string, post *feedsv1.Post) uint64 {
	localPostId := id.Next()

	var creator string
	if feedRaw, ok := feeds.Get(feedId); ok {
		// local feed, can be protected
		feed := feedRaw.(*Feed)
		creator = feed.auth()
		feedsByPost.Set(localPostId.String(), feed)
	} else {
		creator = realmid.Previous()
	}

	post.Author = creator
	post.CreatedAt = time.Now().Unix()
	post.UpdatedAt = time.Now().Unix()
	post.DeletedAt = 0
	post.LocalPostId = uint64(localPostId)

	feedKey := feedId + ":" + localPostId.String()
	posts.Set(localPostId.String(), post)
	postsByFeed.Set(feedKey, post)

	if post.ParentUri != "" {
		parentIdInt, err := strconv.ParseUint(post.ParentUri, 10, 64)
		if err != nil {
			panic("parentId is not a valid uint64")
		}
		postsByParent.Set(seqid.ID(parentIdInt).String()+":"+localPostId.String(), post)
	}
	return post.LocalPostId
}

func GetPost(localPostId uint64) *feedsv1.Post {
	localPostIdStr := seqid.ID(localPostId).String()
	postRaw, ok := posts.Get(localPostIdStr)
	if !ok {
		panic("post not found")
	}
	return postRaw.(*feedsv1.Post)
}

func DeletePost(_ realm, localPostId uint64) {
	localPostIdStr := seqid.ID(localPostId).String()
	postRaw, ok := posts.Get(localPostIdStr)
	if !ok {
		panic("post not found")
	}

	var caller string
	if feedRaw, ok := feedsByPost.Get(localPostIdStr); ok {
		caller = feedRaw.(*Feed).auth()
	} else {
		caller = realmid.Previous()
	}

	post := postRaw.(*feedsv1.Post)
	if post.Author != caller {
		panic("you are not the author of this post")
	}
	if post.DeletedAt != 0 {
		panic("post is deleted")
	}
	// XXX: should we just remove the post from the feed & all trees ?
	post.DeletedAt = time.Now().Unix()
}

func EditPost(_ realm, localPostId uint64, newPost *feedsv1.Post) {
	localPostIdStr := seqid.ID(localPostId).String()
	postRaw, ok := posts.Get(localPostIdStr)
	if !ok {
		panic("post not found")
	}

	var caller string
	if feedRaw, ok := feedsByPost.Get(localPostIdStr); ok {
		caller = feedRaw.(*Feed).auth()
	} else {
		caller = realmid.Previous()
	}

	post := postRaw.(*feedsv1.Post)
	if post.Author != caller {
		panic("you are not the author of this post")
	}
	if post.DeletedAt != 0 {
		panic("post is deleted")
	}

	//XXX: this is a hack to force these fields to be same as the original post
	newPost.LocalPostId = post.LocalPostId
	newPost.CreatedAt = post.CreatedAt
	newPost.Author = post.Author
	newPost.ParentUri = post.ParentUri
	newPost.UpdatedAt = time.Now().Unix()
	*post = *newPost
}

func ReactPost(_ realm, localPostId uint64, icon string) {
	localPostIdStr := seqid.ID(localPostId).String()

	var caller string
	if feedRaw, ok := feedsByPost.Get(localPostIdStr); ok {
		caller = feedRaw.(*Feed).auth()
	} else {
		caller = realmid.Previous()
	}

	userReactId := localPostIdStr + ":" + icon + ":" + caller
	reactId := localPostIdStr + ":" + icon

	if userReactions.Has(userReactId) {
		userReactions.Remove(userReactId)

		count := uint32(1)
		if reactions.Has(reactId) {
			countRaw, _ := reactions.Get(reactId)
			count = countRaw.(uint32)
			if count > 1 {
				reactions.Set(reactId, count-1)
			} else {
				reactions.Remove(reactId)
			}
		}
	} else {
		userReactions.Set(userReactId, struct{}{})

		count := uint32(0)
		if reactions.Has(reactId) {
			countRaw, _ := reactions.Get(reactId)
			count = countRaw.(uint32)
		}
		reactions.Set(reactId, count+1)
	}
}

func GetPostReactions(localPostId uint64, user string) []*feedsv1.ReactionView {
	localPostIdStr := seqid.ID(localPostId).String()
	var res []*feedsv1.ReactionView
	start := localPostIdStr + ":"
	end := localPostIdStr + ";"
	reactions.Iterate(start, end, func(key string, value interface{}) bool {
		icon := key[len(localPostIdStr)+1:]
		count := value.(uint32)

		userReactKey := localPostIdStr + ":" + icon + ":" + user
		userHasVoted := userReactions.Has(userReactKey)

		react := &feedsv1.ReactionView{
			Icon:         icon,
			Count:        count,
			UserHasVoted: userHasVoted,
		}
		res = append(res, react)
		return false
	})
	return res

}

func GetPostView(localPostId uint64, user string) *feedsv1.PostView {
	return &feedsv1.PostView{
		Post:          GetPost(localPostId),
		Reactions:     GetPostReactions(localPostId, user),
		ChildrenCount: CountChildren(localPostId),
	}
}
