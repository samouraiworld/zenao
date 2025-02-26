package social_feed

import (
	"std"
	"testing"

	"gno.land/p/demo/testutils"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
)

func TestNewPost(t *testing.T) {
	type input struct {
		feedId string
		post   *zenaov1.Post
	}

	type output struct {
		localPostId string
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
				post:   &zenaov1.Post{},
			},
			output: output{
				localPostId: "public:0000001",
				panic:       false,
			},
		},
		"private feed": {
			input: input{
				feedId: alice.String() + ":private",
				post:   &zenaov1.Post{},
			},
			output: output{
				panic: true,
			},
		},
	}

	std.TestSetOriginCaller(alice)
	NewFeed("private", false, func(string) bool { return false })

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
