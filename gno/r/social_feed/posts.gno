package social_feed

import (
	"std"
	"time"

	feedsv1 "gno.land/p/zenao/feeds/v1"
)

func NewPost(feedId string, post *feedsv1.Post) string {
	feedRaw, ok := feeds.Get(feedId)
	if ok {
		feed := feedRaw.(*Feed)
		if feed.authFunc != nil && !feed.authFunc(std.PreviousRealm().Address().String()) {
			panic("this is a private feed and you are not authorized to post on it")
		}
	}
	localPostId := feedId + ":" + id.Next().String()
	posts.Set(localPostId, post)
	return localPostId
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
	posts.Set(localPostId, newPost)
}

// XXX: create a tree just for addresses that have reacted to a post
func ReactPost(localPostId string, icon string) {
	caller := std.PreviousRealm().Address()
	reactId := localPostId + ":" + icon

	var reacts []string
	reactRaw, ok := reactions.Get(reactId)
	if !ok {
		reacts = []string{caller.String()}
	} else {
		reacts = reactRaw.([]string)
		for i, v := range reacts {
			if v == caller.String() {
				reacts = append(reacts[:i], reacts[i+1:]...)
				reactions.Set(reactId, reacts)
				return
			}
		}
		reacts = append(reacts, caller.String())
	}
	reactions.Set(reactId, reacts)
}

func GetPostReactions(localPostId string, user string) []*feedsv1.ReactionView {
	var res []*feedsv1.ReactionView
	start := localPostId + ":"
	end := localPostId + ";"
	reactions.Iterate(start, end, func(key string, value interface{}) bool {
		react := &feedsv1.ReactionView{
			Icon:         key[len(localPostId)+1:],
			Count:        uint32(len(value.([]string))),
			UserHasVoted: false,
		}
		for _, v := range value.([]string) {
			if v == user {
				react.UserHasVoted = true
				break
			}
		}
		res = append(res, react)
		return false
	})
	return res

}
