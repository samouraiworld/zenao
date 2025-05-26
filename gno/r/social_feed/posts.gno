package social_feed

import (
	"std"
	"strconv"
	"time"

	"gno.land/p/demo/seqid"

	feedsv1 "gno.land/p/zenao/feeds/v1"
)

func NewPost(feedId string, post *feedsv1.Post) uint64 {
	creator := std.PreviousRealm().Address().String()
	post.Author = creator
	post.CreatedAt = time.Now().Unix()
	post.UpdatedAt = time.Now().Unix()
	post.DeletedAt = 0

	feedRaw, ok := feeds.Get(feedId)
	if ok {
		feed := feedRaw.(*Feed)
		if feed.authFunc != nil && !feed.authFunc(std.PreviousRealm().Address().String()) {
			panic("this is a private feed and you are not authorized to post on it")
		}
	}

	localPostId := id.Next()
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

func DeletePost(localPostId uint64) {
	creator := std.PreviousRealm()
	localPostIdStr := seqid.ID(localPostId).String()
	postRaw, ok := posts.Get(localPostIdStr)
	if !ok {
		panic("post not found")
	}
	post := postRaw.(*feedsv1.Post)
	if post.Author != creator.Address().String() {
		panic("you are not the author of this post")
	}
	if post.DeletedAt != 0 {
		panic("post is deleted")
	}
	post.DeletedAt = time.Now().Unix()
}

func EditPost(localPostId uint64, newPost *feedsv1.Post) {
	caller := std.PreviousRealm()
	localPostIdStr := seqid.ID(localPostId).String()
	postRaw, ok := posts.Get(localPostIdStr)
	if !ok {
		panic("post not found")
	}
	post := postRaw.(*feedsv1.Post)
	if post.Author != caller.Address().String() {
		panic("you are not the author of this post")
	}
	if post.DeletedAt != 0 {
		panic("post is deleted")
	}

	//XXX: this is a hack to force the localPostId to be the same as the original post
	newPost.LocalPostId = post.LocalPostId

	*post = *newPost
	post.UpdatedAt = time.Now().Unix()
}

func ReactPost(localPostId uint64, icon string) {
	caller := std.PreviousRealm().Address()
	localPostIdStr := seqid.ID(localPostId).String()
	userReactId := localPostIdStr + ":" + icon + ":" + caller.String()
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
