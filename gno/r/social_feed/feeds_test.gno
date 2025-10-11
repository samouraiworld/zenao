package social_feed

import (
	"testing"

	feedsv1 "gno.land/p/zenao/feeds/v1"
)

func TestNewFeed(t *testing.T) {
	type input struct {
		slug         string
		crossNetwork bool
		authFunc     func() (string, bool)
	}

	type output struct {
		feedId string
		panic  bool
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	tests := testTable{
		"valid feed": {
			input: input{
				slug:         "public",
				crossNetwork: false,
				authFunc:     nil,
			},
			output: output{
				feedId: alice.String() + ":public",
				panic:  false,
			},
		},
		"crossNetwork feed": {
			input: input{
				slug:         "public2",
				crossNetwork: true,
				authFunc:     nil,
			},
			output: output{
				feedId: alice.String() + ":public2",
				panic:  false,
			},
		},
		"authFunc feed": {
			input: input{
				slug:         "public3",
				crossNetwork: false,
				authFunc:     func() (string, bool) { return "", false },
			},
			output: output{
				feedId: alice.String() + ":public3",
				panic:  false,
			},
		},
		/*
			"crossNetwork feed with authFunc": {
				input: input{
					slug:         "public4",
					crossNetwork: true,
					authFunc:     func(string) bool { return false },
				},
				output: output{
					panic: true,
				},
			},
			"feed already exists": {
				input: input{
					slug:         "public",
					crossNetwork: false,
					authFunc:     nil,
				},
				output: output{
					panic: true,
				},
			},
		*/
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					if !test.output.panic {
						t.Fatalf("unexpected panic: %v", r)
					}
					return
				}
				if test.output.panic {
					t.Fatalf("expected panic, got none")
				}
			}()

			testing.SetContext(testing.Context{
				CurrentRealm: testing.NewUserRealm(alice),
			})
			feedId := NewFeed(cross, test.input.slug, test.input.crossNetwork, test.input.authFunc)
			if !test.output.panic && feedId != test.output.feedId {
				t.Fatalf("expected feedId %q, got %q", test.output.feedId, feedId)
			}
		})
	}
}

func TestGetFeedPosts(t *testing.T) {
	setupTest()

	type input struct {
		feedId string
		offset uint32
		limit  uint32
		tags   string
		user   string
	}

	type output struct {
		posts []*feedsv1.PostView
		panic bool
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	posts := []*feedsv1.PostView{
		{
			Post: &feedsv1.Post{
				Author:    alice.String(),
				DeletedAt: 0,
				Post: &feedsv1.StandardPost{
					Content: "hello",
				},
				Tags: []string{"tag1", "tag2"},
			},
		},
		{
			Post: &feedsv1.Post{
				Author:    alice.String(),
				DeletedAt: 0,
				Post: &feedsv1.LinkPost{
					Uri: "https://example.com",
				},
				Tags: []string{"tag1"},
			},
		},
		{
			Post: &feedsv1.Post{
				Author:    alice.String(),
				DeletedAt: 0,
				Post: &feedsv1.ImagePost{
					Description: "an image",
					ImageUri:    "https://example.com/image.jpg",
				},
			},
		},
	}

	tests := testTable{
		"valid feed": {
			input: input{
				feedId: alice.String() + ":public",
				offset: 0,
				limit:  10,
				tags:   "",
				user:   "",
			},
			output: output{
				posts: posts,
				panic: false,
			},
		},
		"empty feed": {
			input: input{
				feedId: alice.String() + ":empty",
				offset: 0,
				limit:  10,
				tags:   "",
				user:   "",
			},
			output: output{
				posts: []*feedsv1.PostView{},
				panic: false,
			},
		},
		/*
			"invalid feed": {
				input: input{
					feedId: "",
					offset: 0,
					limit:  10,
					tags:   "",
					user:   "",
				},
				output: output{
					panic: true,
				},
			},
		*/
		"limit 2": {
			input: input{
				feedId: alice.String() + ":public",
				offset: 0,
				limit:  2,
				tags:   "",
				user:   "",
			},
			output: output{
				posts: posts[:2],
				panic: false,
			},
		},
		"offset 1": {
			input: input{
				feedId: alice.String() + ":public",
				offset: 1,
				limit:  10,
				tags:   "",
				user:   "",
			},
			output: output{
				posts: posts[1:],
				panic: false,
			},
		},
		/*
			"empty id": {
				input: input{
					feedId: "",
					offset: 0,
					limit:  10,
					tags:   "",
					user:   "",
				},
				output: output{
					panic: true,
				},
			},
		*/
		"tag filter": {
			input: input{
				feedId: alice.String() + ":public",
				offset: 0,
				limit:  10,
				tags:   "tag1",
				user:   "",
			},
			output: output{
				posts: posts[:2],
				panic: false,
			},
		},
		"tag filter 2": {
			input: input{
				feedId: alice.String() + ":public",
				offset: 0,
				limit:  10,
				tags:   "tag2",
				user:   "",
			},
			output: output{
				posts: posts[:1],
				panic: false,
			},
		},
	}

	testing.SetContext(testing.Context{
		CurrentRealm: testing.NewUserRealm(alice),
	})
	//XXX post in reverse order so that the newest post is first
	for i := len(posts) - 1; i >= 0; i-- {
		NewPost(cross, alice.String()+":public", posts[i].Post)
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			if test.output.panic {
				defer func() {
					if r := recover(); r != nil {
						return
					}
					t.Fatalf("expected panic, got none")
				}()
			}

			res := GetFeedPosts(test.input.feedId, test.input.offset, test.input.limit, test.input.tags, test.input.user)
			if len(res) != len(test.output.posts) {
				t.Fatalf("expected %d posts, got %d", len(test.output.posts), len(res))
			}
			for i, postView := range res {
				post := postView.Post
				if post.Author != test.output.posts[i].Post.Author {
					t.Errorf("expected author %q, got %q", test.output.posts[i].Post.Author, post.Author)
				}
				if post.DeletedAt != test.output.posts[i].Post.DeletedAt {
					t.Errorf("expected deletedAt %d, got %d", test.output.posts[i].Post.DeletedAt, post.DeletedAt)
				}
				switch v := post.Post.(type) {
				case *feedsv1.StandardPost:
					if v.Content != test.output.posts[i].Post.Post.(*feedsv1.StandardPost).Content {
						t.Errorf("expected content %q, got %q", test.output.posts[i].Post.Post.(*feedsv1.StandardPost).Content, v.Content)
					}
				case *feedsv1.LinkPost:
					if v.Uri != test.output.posts[i].Post.Post.(*feedsv1.LinkPost).Uri {
						t.Errorf("expected uri %q, got %q", test.output.posts[i].Post.Post.(*feedsv1.LinkPost).Uri, v.Uri)
					}
				case *feedsv1.ImagePost:
					if v.Description != test.output.posts[i].Post.Post.(*feedsv1.ImagePost).Description {
						t.Errorf("expected description %q, got %q", test.output.posts[i].Post.Post.(*feedsv1.ImagePost).Description, v.Description)
					}
					if v.ImageUri != test.output.posts[i].Post.Post.(*feedsv1.ImagePost).ImageUri {
						t.Errorf("expected imageUri %q, got %q", test.output.posts[i].Post.Post.(*feedsv1.ImagePost).ImageUri, v.ImageUri)
					}
				}
			}

		})
	}
}

func TestGetChildrenPosts(t *testing.T) {
	setupTest()

	type input struct {
		parentId string
		offset   uint32
		limit    uint32
		tags     string
		user     string
	}

	type output struct {
		posts []*feedsv1.PostView
		panic bool
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	posts := []*feedsv1.Post{
		{
			Author:    alice.String(),
			DeletedAt: 0,
			ParentUri: "3",
			Post: &feedsv1.StandardPost{
				Content: "hello",
			},
		},
		{
			Author:    alice.String(),
			DeletedAt: 0,
			ParentUri: "1",
			Post: &feedsv1.StandardPost{
				Content: "hello 2",
			},
		},
		{
			Author:    alice.String(),
			DeletedAt: 0,
			ParentUri: "1",
			Post: &feedsv1.StandardPost{
				Content: "hello 5",
			},
			Tags: []string{"tag1"},
		},
		{
			Author:    alice.String(),
			DeletedAt: 0,
			ParentUri: "1",
			Post: &feedsv1.StandardPost{
				Content: "hello 3",
			},
		},
		{
			Author:    alice.String(),
			DeletedAt: 0,
			Post: &feedsv1.StandardPost{
				Content: "hello 4",
			},
		},
	}

	testing.SetContext(testing.Context{
		CurrentRealm: testing.NewUserRealm(alice),
	})
	//XXX post in reverse order so that the newest post is first
	for i := len(posts) - 1; i >= 0; i-- {
		NewPost(cross, alice.String()+":public", posts[i])
	}

	expectedViews := []*feedsv1.PostView{
		{
			Post:          posts[0],
			ChildrenCount: 0,
		},
		{
			Post:          posts[1],
			ChildrenCount: 0,
		},
		{
			Post:          posts[2],
			ChildrenCount: 1,
		},
		{
			Post:          posts[3],
			ChildrenCount: 0,
		},
	}

	tests := testTable{
		"valid parentId": {
			input: input{
				parentId: "1",
				offset:   0,
				limit:    10,
				tags:     "",
				user:     "",
			},
			output: output{
				posts: expectedViews[1:],
				panic: false,
			},
		},
		"limit 1": {
			input: input{
				parentId: "1",
				offset:   0,
				limit:    1,
				tags:     "",
				user:     "",
			},
			output: output{
				posts: expectedViews[1:2],
				panic: false,
			},
		},
		"tag filter": {
			input: input{
				parentId: "1",
				offset:   0,
				limit:    10,
				tags:     "tag1",
				user:     "",
			},
			output: output{
				posts: expectedViews[2:3],
				panic: false,
			},
		},
		"nested parentId": {
			input: input{
				parentId: "3",
				offset:   0,
				limit:    10,
				tags:     "",
				user:     "",
			},
			output: output{
				posts: expectedViews[0:1],
				panic: false,
			},
		},
		/*
			"empty parentId": {
				input: input{
					parentId: "",
					offset:   0,
					limit:    10,
					tags:     "",
					user:     "",
				},
				output: output{
					panic: true,
				},
			},
		*/
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			if test.output.panic {
				defer func() {
					if r := recover(); r != nil {
						return
					}
					t.Fatalf("expected panic, got none")
				}()
			}

			res := GetChildrenPosts(test.input.parentId, test.input.offset, test.input.limit, test.input.tags, test.input.user)
			if len(res) != len(test.output.posts) {
				t.Fatalf("expected %d posts, got %d", len(test.output.posts), len(res))
			}
			for i, postView := range res {
				post := postView.Post
				if post.Author != test.output.posts[i].Post.Author {
					t.Errorf("expected author %q, got %q", test.output.posts[i].Post.Author, post.Author)
				}
				if post.DeletedAt != test.output.posts[i].Post.DeletedAt {
					t.Errorf("expected deletedAt %d, got %d", test.output.posts[i].Post.DeletedAt, post.DeletedAt)
				}
				switch v := post.Post.(type) {
				case *feedsv1.StandardPost:
					if v.Content != test.output.posts[i].Post.Post.(*feedsv1.StandardPost).Content {
						t.Errorf("expected content %q, got %q", test.output.posts[i].Post.Post.(*feedsv1.StandardPost).Content, v.Content)
					}
				default:
					t.Errorf("expected standard post, got %T", v)
				}
				if postView.ChildrenCount != test.output.posts[i].ChildrenCount {
					t.Errorf("expected childrenCount %d, got %d on post id %d for parent id %s", test.output.posts[i].ChildrenCount, postView.ChildrenCount, post.LocalPostId, test.input.parentId)
				}
			}
		})
	}
}
