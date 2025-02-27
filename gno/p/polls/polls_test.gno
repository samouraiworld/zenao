package polls

import (
	"std"
	"testing"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/testutils"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
	carol = testutils.TestAddress("carol")
)

func TestNewPoll(t *testing.T) {
	type input struct {
		id       string
		question string
		options  []string
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
		"valid poll": {
			input: input{
				id:       "poll1",
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green"},
			},
			output: output{
				panic: false,
			},
		},
		"not enough options": {
			input: input{
				id:       "poll2",
				question: "What is your favorite color?",
				options:  []string{"red"},
			},
			output: output{
				panic: true,
			},
		},
		"too many options": {
			input: input{
				id:       "poll3",
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black"},
			},
			output: output{
				panic: true,
			},
		},
		"empty option": {
			input: input{
				id:       "poll4",
				question: "What is your favorite color?",
				options:  []string{"red", "", "green"},
			},
			output: output{
				panic: true,
			},
		},
		"long option": {
			input: input{
				id:       "poll5",
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "this option is too too too too too too long"},
			},
			output: output{
				panic: true,
			},
		},
		"duplicate option": {
			input: input{
				id:       "poll6",
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green", "blue"},
			},
			output: output{
				panic: true,
			},
		},
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			defer func() {
				r := recover()
				if r != nil && !test.output.panic {
					t.Errorf("unexpected panic: %v", r)
				}
				if r == nil && test.output.panic {
					t.Errorf("expected panic")
				}
			}()

			NewPoll(test.input.id, test.input.question, test.input.options)
		})
	}
}

func TestVote(t *testing.T) {
	type input struct {
		poll   *Poll
		option string
	}

	type output struct {
		voted bool
		panic bool
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	poll := NewPoll("poll1", "What is your favorite color?", []string{"red", "blue", "green"})

	tests := testTable{
		"valid vote": {
			input: input{
				poll:   poll,
				option: "red",
			},
			output: output{
				voted: true,
				panic: false,
			},
		},
		"invalid option": {
			input: input{
				poll:   poll,
				option: "yellow",
			},
			output: output{
				panic: true,
			},
		},
		"remove vote": {
			input: input{
				poll:   poll,
				option: "red",
			},
			output: output{
				voted: false,
				panic: false,
			},
		},
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			defer func() {
				r := recover()
				if r != nil && !test.output.panic {
					t.Errorf("unexpected panic: %v", r)
				}
				if r == nil && test.output.panic {
					t.Errorf("expected panic")
				}
			}()

			std.TestSetOriginCaller(alice)
			test.input.poll.Vote(alice, test.input.option)
			resultRaw, _ := test.input.poll.Results.Get(test.input.option)
			result := resultRaw.(*avl.Tree)
			voted := result.Has(alice.String())
			if voted != test.output.voted {
				t.Errorf("expected voted=%v, got voted=%v", test.output.voted, voted)
			}
		})
	}
}

func TestGetInfo(t *testing.T) {
	type input struct {
		poll *Poll
	}

	type output struct {
		info PollInfo
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	poll := NewPoll("poll1", "What is your favorite color?", []string{"red", "blue", "green"})
	emptyPoll := NewPoll("poll2", "What is your favorite color?", []string{"red", "blue", "green"})
	poll.Vote(alice, "red")
	poll.Vote(bob, "blue")
	poll.Vote(carol, "blue")

	tests := testTable{
		"valid poll": {
			input: input{
				poll: poll,
			},
			output: output{
				info: PollInfo{
					Question: "What is your favorite color?",
					Options: []PollResult{ // XXX: keep it sorted ascending
						{Option: "blue", Votes: 2},
						{Option: "green", Votes: 0},
						{Option: "red", Votes: 1},
					},
				},
			},
		},
		"empty poll": {
			input: input{
				poll: emptyPoll,
			},
			output: output{
				info: PollInfo{
					Question: "What is your favorite color?",
					Options: []PollResult{ // XXX: keep it sorted ascending
						{Option: "blue", Votes: 0},
						{Option: "green", Votes: 0},
						{Option: "red", Votes: 0},
					},
				},
			},
		},
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			info := test.input.poll.GetInfo()
			if info.Question != test.output.info.Question {
				t.Errorf("expected question=%q, got question=%q", test.output.info.Question, info.Question)
			}
			if len(info.Options) != len(test.output.info.Options) {
				t.Errorf("expected %d options, got %d options", len(test.output.info.Options), len(info.Options))
			}
			for i, expected := range test.output.info.Options {
				actual := info.Options[i]
				if expected.Option != actual.Option {
					t.Errorf("expected option=%q, got option=%q", expected.Option, actual.Option)
				}
				if expected.Votes != actual.Votes {
					t.Errorf("expected votes=%d, got votes=%d", expected.Votes, actual.Votes)
				}
			}
		})
	}
}
