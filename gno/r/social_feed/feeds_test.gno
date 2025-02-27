package social_feed

import (
	"std"
	"testing"

	zenaov1 "gno.land/p/zenao/zenao/v1"
)

func TestNewFeed(t *testing.T) {
	type input struct {
		slug         string
		crossNetwork bool
		authFunc     func(string) bool
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
				authFunc:     func(string) bool { return false },
			},
			output: output{
				feedId: alice.String() + ":public3",
				panic:  false,
			},
		},
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
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			setupTest()

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

			std.TestSetOriginCaller(alice)
			feedId := NewFeed(test.input.slug, test.input.crossNetwork, test.input.authFunc)
			if feedId != test.output.feedId {
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
	}

	type output struct {
		posts []*zenaov1.Post
		panic bool
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	posts := []*zenaov1.Post{
		{
			Post: &zenaov1.StandardPost{
				Common: &zenaov1.PostCommon{
					Author:    alice.String(),
					DeletedAt: 0,
				},
				Content: "hello",
			},
		},
		{
			Post: &zenaov1.LinkPost{
				Common: &zenaov1.PostCommon{
					Author:    alice.String(),
					DeletedAt: 0,
				},
				Uri: "https://example.com",
			},
		},
		{
			Post: &zenaov1.ImagePost{
				Common: &zenaov1.PostCommon{
					Author:    alice.String(),
					DeletedAt: 0,
				},
				Description: "an image",
				ImageUri:    "https://example.com/image.jpg",
			},
		},
	}

	tests := testTable{
		"valid feed": {
			input: input{
				feedId: alice.String() + ":public",
				offset: 0,
				limit:  10,
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
			},
			output: output{
				posts: []*zenaov1.Post{},
				panic: false,
			},
		},
		"invalid feed": {
			input: input{
				feedId: "",
				offset: 0,
				limit:  10,
			},
			output: output{
				panic: true,
			},
		},
		"limit 2": {
			input: input{
				feedId: alice.String() + ":public",
				offset: 0,
				limit:  2,
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
			},
			output: output{
				posts: posts[1:],
				panic: false,
			},
		},
		"empty id": {
			input: input{
				feedId: "",
				offset: 0,
				limit:  10,
			},
			output: output{
				panic: true,
			},
		},
	}

	std.TestSetOriginCaller(alice)
	for _, post := range posts {
		NewPost(alice.String()+":public", post)
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

			res := GetFeedPosts(test.input.feedId, test.input.offset, test.input.limit)
			if len(res) != len(test.output.posts) {
				t.Fatalf("expected %d posts, got %d", len(test.output.posts), len(res))
			}
			for i, post := range res {
				common := getPostCommon(post)
				commonExpected := getPostCommon(test.output.posts[i])
				if common.Author != commonExpected.Author {
					t.Errorf("expected author %q, got %q", commonExpected.Author, common.Author)
				}
				if common.DeletedAt != commonExpected.DeletedAt {
					t.Errorf("expected deletedAt %d, got %d", commonExpected.DeletedAt, common.DeletedAt)
				}
				switch v := post.Post.(type) {
				case *zenaov1.StandardPost:
					if v.Content != test.output.posts[i].Post.(*zenaov1.StandardPost).Content {
						t.Errorf("expected content %q, got %q", test.output.posts[i].Post.(*zenaov1.StandardPost).Content, v.Content)
					}
				case *zenaov1.LinkPost:
					if v.Uri != test.output.posts[i].Post.(*zenaov1.LinkPost).Uri {
						t.Errorf("expected uri %q, got %q", test.output.posts[i].Post.(*zenaov1.LinkPost).Uri, v.Uri)
					}
				case *zenaov1.ImagePost:
					if v.Description != test.output.posts[i].Post.(*zenaov1.ImagePost).Description {
						t.Errorf("expected description %q, got %q", test.output.posts[i].Post.(*zenaov1.ImagePost).Description, v.Description)
					}
					if v.ImageUri != test.output.posts[i].Post.(*zenaov1.ImagePost).ImageUri {
						t.Errorf("expected imageUri %q, got %q", test.output.posts[i].Post.(*zenaov1.ImagePost).ImageUri, v.ImageUri)
					}
				}
			}

		})
	}
}
