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
