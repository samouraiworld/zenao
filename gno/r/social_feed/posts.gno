package social_feed

import (
	"std"
	"time"

	zenaov1 "gno.land/p/zenao/zenao/v1"
)

func NewPost(feedId string, post *zenaov1.Post) string {
	feedRaw, ok := feeds.Get(feedId)
	if ok {
		feed := feedRaw.(*Feed)
		if !feed.authFunc(std.PreviousRealm().Address().String()) {
			panic("this is a private feed and you are not authorized to post on it")
		}
	}
	localPostId := feedId + ":" + id.Next().String()
	posts.Set(localPostId, post)
	return localPostId
}

func GetPost(postID string) zenaov1.Post {
	postRaw, ok := posts.Get(postID)
	if !ok {
		panic("post not found")
	}
	return postRaw.(zenaov1.Post)
}

func DeletePost(postID string) {
	creator := std.PreviousRealm()
	postRaw, ok := posts.Get(postID)
	if !ok {
		panic("post not found")
	}
	post := postRaw.(*zenaov1.Post)
	common := getPostCommon(post)
	if common.Author != creator.Address().String() {
		panic("you are not the author of this post")
	}
	if common == nil {
		panic("post common is nil")
	}
	if common.DeletedAt != 0 {
		panic("post is already deleted")
	}
	common.DeletedAt = time.Now().Unix()
}

// / XXX: should we restrict editing to the same kind of post?
func EditPost(postID string, newPost *zenaov1.Post) {
	creator := std.PreviousRealm()
	postRaw, ok := posts.Get(postID)
	if !ok {
		panic("post not found")
	}
	post := postRaw.(*zenaov1.Post)
	common := getPostCommon(post)
	if common.Author != creator.Address().String() {
		panic("you are not the author of this post")
	}
	if common == nil {
		panic("post common is nil")
	}
	if common.DeletedAt != 0 {
		panic("post is deleted")
	}
	posts.Set(postID, newPost)
}

func getPostCommon(post *zenaov1.Post) *zenaov1.PostCommon {
	if post == nil {
		panic("post is nil")
	}
	switch v := post.Post.(type) {
	case *zenaov1.StandardPost:
		return v.Common
	case *zenaov1.ArticlePost:
		return v.Common
	case *zenaov1.LinkPost:
		return v.Common
	case *zenaov1.ImagePost:
		return v.Common
	case *zenaov1.VideoPost:
		return v.Common
	default:
		panic("unknown post type")
	}
}
