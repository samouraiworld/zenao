package social_feed

import (
	"std"
	"testing"
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
