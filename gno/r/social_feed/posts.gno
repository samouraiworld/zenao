package social_feed

import (
	"std"
	"time"

	feedsv1 "gno.land/p/zenao/feeds/v1"
)

func NewPost(feedId string, post *feedsv1.Post) string {

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

	post.LocalPostId = id.Next().String()
	feedKey := feedId + ":" + post.LocalPostId
	posts.Set(post.LocalPostId, post)
	postsByFeed.Set(feedKey, post)
	return post.LocalPostId
}

func GetPost(localPostId string) *feedsv1.Post {
	postRaw, ok := posts.Get(localPostId)
	if !ok {
		panic("post not found")
	}
	return postRaw.(*feedsv1.Post)
}

func DeletePost(localPostId string) {
	creator := std.PreviousRealm()
	postRaw, ok := posts.Get(localPostId)
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

func EditPost(localPostId string, newPost *feedsv1.Post) {
	caller := std.PreviousRealm()
	postRaw, ok := posts.Get(localPostId)
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

func ReactPost(localPostId string, icon string) {
	caller := std.PreviousRealm().Address()

	userReactId := localPostId + ":" + icon + ":" + caller.String()
	reactId := localPostId + ":" + icon

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

func GetPostReactions(localPostId string, user string) []*feedsv1.ReactionView {
	var res []*feedsv1.ReactionView
	start := localPostId + ":"
	end := localPostId + ";"
	reactions.Iterate(start, end, func(key string, value interface{}) bool {
		icon := key[len(localPostId)+1:]
		count := value.(uint32)

		userReactKey := localPostId + ":" + icon + ":" + user
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
