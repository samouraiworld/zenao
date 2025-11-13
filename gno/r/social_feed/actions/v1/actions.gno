package v1

import (
	"chain"

	"gno.land/p/nt/ufmt"
	"gno.land/p/zenao/daokit"
	feedsv1 "gno.land/p/zenao/feeds/v1"
	"gno.land/r/zenao/social_feed"
)

const ActionNewPostKind = "gno.land/r/zenao/social_feed/actions/v1.NewPost"

type ActionNewPost struct {
	feedID string
	post   *feedsv1.Post
}

func (a *ActionNewPost) String() string {
	return ufmt.Sprintf("Submit new post to feed %s\n", a.feedID)
}

func ActionNewPostHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionNewPostKind, func(i interface{}) {
		action, ok := i.(*ActionNewPost)
		if !ok {
			panic("invalid action payload")
		}
		postNotTainted := &feedsv1.Post{
			Loc:       action.post.Loc,
			Tags:      action.post.Tags,
			Post:      action.post.Post,
			ParentUri: action.post.ParentUri,
		}
		postID := social_feed.NewPost(cross, action.feedID, postNotTainted)
		chain.Emit("zenao-post-create", "postID", ufmt.Sprintf("%d", postID))
	})
}

func NewActionNewPost(feedID string, post *feedsv1.Post) daokit.Action {
	return daokit.NewAction(ActionNewPostKind, &ActionNewPost{
		feedID: feedID,
		post:   post,
	})
}

const ActionEditPostKind = "gno.land/r/zenao/social_feed/actions/v1.EditPost"

type ActionEditPost struct {
	postID uint64
	post   *feedsv1.Post
}

func (a *ActionEditPost) String() string {
	return ufmt.Sprintf("Edit post %d\n", a.postID)
}

func ActionEditPostHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionEditPostKind, func(i interface{}) {
		action, ok := i.(*ActionEditPost)
		if !ok {
			panic("invalid action payload")
		}
		postNotTainted := &feedsv1.Post{
			Loc:       action.post.Loc,
			Tags:      action.post.Tags,
			Post:      action.post.Post,
			ParentUri: action.post.ParentUri,
		}
		social_feed.EditPost(cross, action.postID, postNotTainted)
	})
}

func NewActionEditPost(postID uint64, post *feedsv1.Post) daokit.Action {
	return daokit.NewAction(ActionEditPostKind, &ActionEditPost{
		postID: postID,
		post:   post,
	})
}

const ActionDeletePostKind = "gno.land/r/zenao/social_feed/actions/v1.DeletePost"

type ActionDeletePost struct {
	postID uint64
}

func (a *ActionDeletePost) String() string {
	return ufmt.Sprintf("Delete post %d\n", a.postID)
}

func ActionDeletePostHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionDeletePostKind, func(i interface{}) {
		action, ok := i.(*ActionDeletePost)
		if !ok {
			panic("invalid action payload")
		}
		social_feed.DeletePost(cross, action.postID)
	})
}

func NewActionDeletePost(postID uint64) daokit.Action {
	return daokit.NewAction(ActionDeletePostKind, &ActionDeletePost{
		postID: postID,
	})
}

const ActionReactPostKind = "gno.land/r/zenao/social_feed/actions/v1.ReactPost"

type ActionReactPost struct {
	postID uint64
	icon   string
}

func (a *ActionReactPost) String() string {
	return ufmt.Sprintf("React to post %d with %s\n", a.postID, a.icon)
}

func ActionReactPostHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionReactPostKind, func(i interface{}) {
		action, ok := i.(*ActionReactPost)
		if !ok {
			panic("invalid action payload")
		}
		social_feed.ReactPost(cross, action.postID, action.icon)
	})
}

func NewActionReactPost(postID uint64, icon string) daokit.Action {
	return daokit.NewAction(ActionReactPostKind, &ActionReactPost{
		postID: postID,
		icon:   icon,
	})
}
