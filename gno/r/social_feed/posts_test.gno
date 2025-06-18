package social_feed

import (
	"std"
	"testing"
	"time"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/seqid"
	"gno.land/p/demo/testutils"
	feedsv1 "gno.land/p/zenao/feeds/v1"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
)

func TestNewPost(t *testing.T) {
	setupTest()
	type input struct {
		feedId string
		post   *feedsv1.Post
	}

	type output struct {
		localPostId uint64
		panic       bool
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	tests := testTable{
		"valid post": {
			input: input{
				feedId: "public",
				post:   &feedsv1.Post{},
			},
			output: output{
				localPostId: 1,
				panic:       false,
			},
		},
		"private feed": {
			input: input{
				feedId: alice.String() + ":private",
				post:   &feedsv1.Post{},
			},
			output: output{
				panic: true,
			},
		},
	}

	std.TestSetOriginCaller(alice)
	pvFunc := func(string) bool { return false }
	NewFeed("private", false, pvFunc)

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if tc.output.panic {
				defer func() {
					if r := recover(); r == nil {
						t.Errorf("expected panic")
					}
				}()
			}
			got := NewPost(tc.input.feedId, tc.input.post)
			if !tc.output.panic && got != tc.output.localPostId {
				t.Errorf("expected %q, got %q", tc.output.localPostId, got)
			}
		})
	}
}

func TestGetPost(t *testing.T) {
	setupTest()

	type input struct {
		localPostId uint64
	}

	type output struct {
		post  *feedsv1.Post
		panic bool
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	validPost := &feedsv1.Post{
		Author:    alice.String(),
		DeletedAt: 0,
		Post:      &feedsv1.StandardPost{},
	}

	tests := testTable{
		"valid post": {
			input: input{
				localPostId: 1,
			},
			output: output{
				post:  validPost,
				panic: false,
			},
		},
		"invalid post": {
			input: input{
				localPostId: 2,
			},
			output: output{
				panic: true,
			},
		},
	}

	std.TestSetOriginCaller(alice)
	NewPost("public", validPost)

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if tc.output.panic {
				defer func() {
					if r := recover(); r == nil {
						t.Errorf("expected panic")
					}
				}()
			}
			got := GetPost(tc.input.localPostId)
			if !tc.output.panic && got != tc.output.post {
				t.Errorf("expected %v, got %v", tc.output.post, got)
			}
		})
	}
}

func TestDeletePost(t *testing.T) {
	setupTest()

	type input struct {
		localPostId uint64
		caller      std.Address
	}

	type output struct {
		panic bool
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	tests := testTable{
		"valid post": {
			input: input{
				localPostId: 1,
				caller:      alice,
			},
			output: output{
				panic: false,
			},
		},
		"invalid post": {
			input: input{
				localPostId: 2,
				caller:      alice,
			},
			output: output{
				panic: true,
			},
		},
		"not the creator": {
			input: input{
				localPostId: 1,
				caller:      bob,
			},
			output: output{
				panic: true,
			},
		},
		"already deleted": {
			input: input{
				localPostId: 1,
				caller:      alice,
			},
			output: output{
				panic: true,
			},
		},
	}

	post := &feedsv1.Post{
		Author:    alice.String(),
		DeletedAt: 0,
		Post:      &feedsv1.StandardPost{},
	}

	std.TestSetOriginCaller(alice)
	NewPost("public", post)

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if tc.output.panic {
				defer func() {
					if r := recover(); r == nil {
						t.Errorf("expected panic")
					}
				}()
			}
			std.TestSetOriginCaller(tc.input.caller)
			DeletePost(tc.input.localPostId)
			got := GetPost(tc.input.localPostId)
			if !tc.output.panic && got.DeletedAt == 0 {
				t.Errorf("expected deleted at %d, got %d", time.Now().Unix(), got.DeletedAt)
			}
		})
	}
}

func TestEditPost(t *testing.T) {
	setupTest()

	type input struct {
		localPostId uint64
		newPost     *feedsv1.Post
	}

	type output struct {
		post    *feedsv1.Post
		panic   bool
		updated bool
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	post := &feedsv1.Post{
		Author:    alice.String(),
		DeletedAt: 0,
		UpdatedAt: 0,
		Tags:      []string{"tag1", "tag2"},
		Post:      &feedsv1.StandardPost{Content: "original content"},
	}

	deletedPost := &feedsv1.Post{
		Author:    alice.String(),
		DeletedAt: 1,
		UpdatedAt: 0,
		Tags:      []string{"tag1", "tag2"},
		Post:      &feedsv1.StandardPost{Content: "original content"},
	}

	bobPost := &feedsv1.Post{
		Author:    bob.String(),
		DeletedAt: 0,
		UpdatedAt: 0,
		Tags:      []string{"tag1", "tag3"},
		Post:      &feedsv1.StandardPost{Content: "new content"},
	}

	aliceNewPost := &feedsv1.Post{
		Author:    alice.String(),
		DeletedAt: 0,
		UpdatedAt: 0,
		Tags:      []string{"tag1", "tag2"},
		Post:      &feedsv1.StandardPost{Content: "new content"},
	}

	std.TestSetOriginCaller(alice)
	NewPost("public", post)
	NewPost("public", deletedPost)
	DeletePost(2)
	std.TestSetOriginCaller(bob)
	NewPost("public", bobPost)
	std.TestSetOriginCaller(alice)

	tests := testTable{
		"valid post": {
			input: input{
				localPostId: 1,
				newPost:     aliceNewPost,
			},
			output: output{
				post:    aliceNewPost,
				panic:   false,
				updated: true,
			},
		},
		"invalid post": {
			input: input{
				localPostId: 4,
				newPost:     aliceNewPost,
			},
			output: output{
				post:    nil,
				panic:   true,
				updated: false,
			},
		},
		"not the creator": {
			input: input{
				localPostId: 3,
				newPost:     aliceNewPost,
			},
			output: output{
				post:    nil,
				panic:   true,
				updated: false,
			},
		},
		"already deleted": {
			input: input{
				localPostId: 2,
				newPost:     aliceNewPost,
			},
			output: output{
				post:    nil,
				panic:   true,
				updated: false,
			},
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if tc.output.panic {
				defer func() {
					if r := recover(); r == nil {
						t.Errorf("expected panic")
					}
				}()
			}
			EditPost(tc.input.localPostId, tc.input.newPost)
			got := GetPost(tc.input.localPostId)
			if tc.output.updated && got.UpdatedAt == 0 {
				t.Errorf("expected updated post")
			}
			if !tc.output.updated && got.UpdatedAt != 0 {
				t.Errorf("expected unchanged post")
			}

			if tc.output.post != nil {
				if got.Author != tc.output.post.Author {
					t.Errorf("expected author %q, got %q", tc.output.post.Author, got.Author)
				}
				if got.DeletedAt != tc.output.post.DeletedAt {
					t.Errorf("expected deleted at %d, got %d", tc.output.post.DeletedAt, got.DeletedAt)
				}
				if len(got.Tags) != len(tc.output.post.Tags) {
					t.Errorf("expected %d tags, got %d", len(tc.output.post.Tags), len(got.Tags))
				}
				for i, tag := range got.Tags {
					if tag != tc.output.post.Tags[i] {
						t.Errorf("expected tag %q, got %q", tc.output.post.Tags[i], tag)
					}
				}
				stdExpected := tc.output.post.Post.(*feedsv1.StandardPost)
				stdGot := got.Post.(*feedsv1.StandardPost)
				if stdExpected.Content != stdGot.Content {
					t.Errorf("expected content %q, got %q", stdExpected.Content, stdGot.Content)
				}
			}
		})
	}
}

func TestReactPost(t *testing.T) {
	setupTest()

	type input struct {
		localPostId uint64
		user        string
	}

	type output struct {
		reactions []*feedsv1.ReactionView
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	post := &feedsv1.Post{
		Author:    alice.String(),
		DeletedAt: 0,
		Post:      &feedsv1.StandardPost{},
	}

	post2 := &feedsv1.Post{
		Author:    alice.String(),
		DeletedAt: 0,
		Post:      &feedsv1.StandardPost{},
	}

	post3 := &feedsv1.Post{
		Author:    alice.String(),
		DeletedAt: 0,
		Post:      &feedsv1.StandardPost{},
	}

	std.TestSetOriginCaller(alice)
	NewPost("public", post)
	NewPost("public", post2)
	NewPost("public", post3)
	ReactPost(1, "like")
	ReactPost(1, "dislike")
	std.TestSetOriginCaller(bob)
	ReactPost(1, "like")
	ReactPost(2, "like")

	tests := testTable{
		"post without reaction": {
			input: input{
				localPostId: 3,
				user:        alice.String(),
			},
			output: output{
				reactions: []*feedsv1.ReactionView{},
			},
		},
		"post with reaction": {
			input: input{
				localPostId: 1,
				user:        alice.String(),
			},
			output: output{
				reactions: []*feedsv1.ReactionView{
					{
						Icon:         "dislike", // keep it sorted
						Count:        1,
						UserHasVoted: true,
					},
					{
						Icon:         "like",
						Count:        2,
						UserHasVoted: true,
					},
				},
			},
		},
		"post with reaction from another user": {
			input: input{
				localPostId: 1,
				user:        bob.String(),
			},
			output: output{
				reactions: []*feedsv1.ReactionView{
					{
						Icon:         "dislike",
						Count:        1,
						UserHasVoted: false,
					},
					{
						Icon:         "like",
						Count:        2,
						UserHasVoted: true,
					},
				},
			},
		},
		"post without reactions": {
			input: input{
				localPostId: 3,
				user:        alice.String(),
			},
			output: output{
				reactions: []*feedsv1.ReactionView{},
			},
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			got := GetPostReactions(tc.input.localPostId, tc.input.user)
			if len(got) != len(tc.output.reactions) {
				t.Errorf("expected %d reactions, got %d", len(tc.output.reactions), len(got))
			}
			for i, r := range got {
				if r.Icon != tc.output.reactions[i].Icon {
					t.Errorf("expected %q, got %q", tc.output.reactions[i].Icon, r.Icon)
				}
				if r.Count != tc.output.reactions[i].Count {
					t.Errorf("expected %d, got %d", tc.output.reactions[i].Count, r.Count)
				}
				if r.UserHasVoted != tc.output.reactions[i].UserHasVoted {
					t.Errorf("expected %t, got %t", tc.output.reactions[i].UserHasVoted, r.UserHasVoted)
				}
			}
		})
	}

}

func setupTest() {
	id = seqid.ID(0)

	reactions = avl.NewTree()

	posts = avl.NewTree()
	postsByFeed = avl.NewTree()

	feeds = avl.NewTree()
}
