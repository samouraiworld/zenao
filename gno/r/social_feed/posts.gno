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

	post.CreatedAt = time.Now().Unix()
	localPostId := id.Next().String()
	post.LocalPostId = localPostId

	feedKey := feedId + ":" + localPostId
	posts.Set(feedKey, post)

	for _, tag := range post.Tags {
		tagKey := feedId + ":" + tag + ":" + localPostId
		postsByTag.Set(tagKey, post)
	}
	postsById.Set(localPostId, post)

	return localPostId
}

func GetPost(localPostId string) *feedsv1.Post {
	postRaw, ok := postsById.Get(localPostId)
	if !ok {
		panic("post not found")
	}
	return postRaw.(*feedsv1.Post)
}

func DeletePost(localPostId string) {
	creator := std.PreviousRealm()
	postRaw, ok := postsById.Get(localPostId)
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

func EditPost(feedId string, localPostId string, newPost *feedsv1.Post) {
	caller := std.PreviousRealm()
	postRaw, ok := postsById.Get(localPostId)
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

	tagsChanged := len(post.Tags) != len(newPost.Tags)
	if !tagsChanged {
		for i, tag := range post.Tags {
			if tag != newPost.Tags[i] {
				tagsChanged = true
				break
			}
		}
	}

	//XXX: maybe remove all tags from index and add them again could be more efficient than creating maps just to compute the diff
	if tagsChanged {
		oldTags := make(map[string]bool, len(post.Tags)) // XXX: could be replaced with an avl.Tree
		newTags := make(map[string]bool, len(newPost.Tags))
		for _, tag := range post.Tags {
			oldTags[tag] = true
		}
		for _, tag := range newPost.Tags {
			newTags[tag] = true
		}

		for tag := range oldTags {
			if !newTags[tag] {
				tagKey := feedId + ":" + tag + ":" + localPostId
				postsByTag.Remove(tagKey)
			}
		}
		for tag := range newTags {
			if !oldTags[tag] {
				tagKey := feedId + ":" + tag + ":" + localPostId
				postsByTag.Set(tagKey, post)
			}
		}
	}
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
