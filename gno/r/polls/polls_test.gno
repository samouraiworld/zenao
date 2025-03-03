package polls

import (
	"std"
	"testing"
	"time"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/seqid"
	"gno.land/p/demo/testutils"
	pollsv1 "gno.land/p/zenao/polls/v1"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
	carol = testutils.TestAddress("carol")
)

func TestNewPoll(t *testing.T) {
	setupTest()

	type input struct {
		question string
		options  []string
		duration int64
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
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green"},
				duration: int64(time.Minute) * 30,
			},
			output: output{
				panic: false,
			},
		},
		"not enough options": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red"},
				duration: int64(time.Minute) * 30,
			},
			output: output{
				panic: true,
			},
		},
		"too many options": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black"},
				duration: int64(time.Minute) * 30,
			},
			output: output{
				panic: true,
			},
		},
		"empty option": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "", "green"},
				duration: int64(time.Minute) * 30,
			},
			output: output{
				panic: true,
			},
		},
		"long option": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "this option is too too too too too too long"},
				duration: int64(time.Minute) * 30,
			},
			output: output{
				panic: true,
			},
		},
		"duplicate option": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green", "blue"},
				duration: int64(time.Minute) * 30,
			},
			output: output{
				panic: true,
			},
		},
		"duration less than 15 minutes": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green"},
				duration: int64(time.Minute) * 10,
			},
			output: output{
				panic: true,
			},
		},
		"duration more than 1 month": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green"},
				duration: int64(time.Hour) * 24 * 30 * 2,
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

			NewPoll(test.input.question, true, test.input.duration, test.input.options, nil)
		})
	}
}

func TestVote(t *testing.T) {
	setupTest()

	type input struct {
		id     uint64
		option string
		caller std.Address
	}

	type output struct {
		choicesToHave    []string
		choicesToNotHave []string
		panic            bool
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	pvFunc := func(addr std.Address) bool {
		if addr == bob {
			return true
		}
		return false

	}
	poll := NewPoll("What is your favorite color?", true, int64(time.Hour), []string{"red", "blue", "green"}, nil)
	pollPv := NewPoll("What is your favorite color?", true, int64(time.Hour), []string{"red", "blue", "green"}, pvFunc)
	pollSingle := NewPoll("What is your favorite color?", false, int64(time.Hour), []string{"red", "blue", "green"}, nil)

	tests := testTable{
		"valid vote": {
			input: input{
				id:     1,
				option: "red",
				caller: alice,
			},
			output: output{
				choicesToHave:    []string{"red"},
				choicesToNotHave: []string{"blue", "green"},
				panic:            false,
			},
		},
		"valid vote 2": {
			input: input{
				id:     1,
				option: "blue",
				caller: alice,
			},
			output: output{
				choicesToHave:    []string{"blue", "red"},
				choicesToNotHave: []string{"green"},
				panic:            false,
			},
		},
		"invalid option": {
			input: input{
				id:     1,
				option: "yellow",
				caller: alice,
			},
			output: output{
				panic: true,
			},
		},
		"remove vote": {
			input: input{
				id:     1,
				option: "red",
				caller: alice,
			},
			output: output{
				choicesToHave:    []string{"blue"},
				choicesToNotHave: []string{"red", "green"},
				panic:            false,
			},
		},
		"poll not found": {
			input: input{
				id:     4,
				option: "red",
				caller: alice,
			},
			output: output{
				panic: true,
			},
		},
		"private poll false": {
			input: input{
				id:     2,
				option: "red",
				caller: alice,
			},
			output: output{
				panic: true,
			},
		},
		"private poll true": {
			input: input{
				id:     2,
				option: "red",
				caller: bob,
			},
			output: output{
				choicesToHave:    []string{"red"},
				choicesToNotHave: []string{"blue", "green"},
				panic:            false,
			},
		},
		"valid single vote": {
			input: input{
				id:     3,
				option: "red",
				caller: alice,
			},
			output: output{
				choicesToHave:    []string{"red"},
				choicesToNotHave: []string{"blue", "green"},
				panic:            false,
			},
		},
		"multiple single vote": {
			input: input{
				id:     3,
				option: "blue",
				caller: alice,
			},
			output: output{
				choicesToHave:    []string{"blue"},
				choicesToNotHave: []string{"red", "green"},
				panic:            false,
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

			std.TestSetOriginCaller(test.input.caller)
			Vote(test.input.id, test.input.option)
			id := seqid.ID(test.input.id)
			pollRaw, ok := polls.Get(id.String())
			if !ok {
				t.Errorf("poll not found")
			}
			poll := pollRaw.(*Poll)
			poll.Results.Iterate("", "", func(option string, votes interface{}) bool {
				votesTree := votes.(*avl.Tree)
				if votesTree.Has(test.input.caller.String()) {
					if !stringInSlice(option, test.output.choicesToHave) {
						t.Errorf("the choice %q is not expected", option)
					}
				} else {
					if !stringInSlice(option, test.output.choicesToNotHave) {
						t.Errorf("the choice %q is expected", option)
					}
				}
				return false
			})
		})
	}
}

func TestGetInfo(t *testing.T) {
	setupTest()
	type input struct {
		id   uint64
		user std.Address
	}

	type output struct {
		info *pollsv1.Poll
	}

	type test struct {
		input  input
		output output
	}

	type testTable = map[string]test

	poll := NewPoll("What is your favorite color?", true, int64(time.Hour), []string{"red", "blue", "green"}, nil)
	emptyPoll := NewPoll("What is your favorite color?", true, int64(time.Hour), []string{"red", "blue", "green"}, nil)
	std.TestSetOriginCaller(alice)
	Vote(1, "blue")
	std.TestSetOriginCaller(bob)
	Vote(1, "blue")
	std.TestSetOriginCaller(carol)
	Vote(1, "red")

	tests := testTable{
		"valid poll alice": {
			input: input{
				id:   1,
				user: alice,
			},
			output: output{
				info: &pollsv1.Poll{
					Question: "What is your favorite color?",
					Results: []*pollsv1.PollResult{
						{Option: "blue", Count: 2, HasUserVoted: true},
						{Option: "green", Count: 0, HasUserVoted: false},
						{Option: "red", Count: 1, HasUserVoted: false},
					},
					MultipleChoices: true,
					Duration:        int64(time.Hour),
					CreatedAt:       poll.CreatedAt,
					CreatedBy:       poll.CreatedBy.String(),
				},
			},
		},
		"valid poll carol": {
			input: input{
				id:   1,
				user: carol,
			},
			output: output{
				info: &pollsv1.Poll{
					Question: "What is your favorite color?",
					Results: []*pollsv1.PollResult{
						{Option: "blue", Count: 2, HasUserVoted: false},
						{Option: "green", Count: 0, HasUserVoted: false},
						{Option: "red", Count: 1, HasUserVoted: true},
					},
					MultipleChoices: true,
					Duration:        int64(time.Hour),
					CreatedAt:       poll.CreatedAt,
					CreatedBy:       poll.CreatedBy.String(),
				},
			},
		},
		"empty poll": {
			input: input{
				id:   2,
				user: alice,
			},
			output: output{
				info: &pollsv1.Poll{
					Question: "What is your favorite color?",
					Results: []*pollsv1.PollResult{
						{Option: "blue", Count: 0, HasUserVoted: false},
						{Option: "green", Count: 0, HasUserVoted: false},
						{Option: "red", Count: 0, HasUserVoted: false},
					},
					MultipleChoices: true,
					Duration:        int64(time.Hour),
					CreatedAt:       emptyPoll.CreatedAt,
					CreatedBy:       emptyPoll.CreatedBy.String(),
				},
			},
		},
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			info := GetInfo(test.input.id, test.input.user.String())
			if info.Question != test.output.info.Question {
				t.Errorf("expected question %q, got %q", test.output.info.Question, info.Question)
			}
			if info.MultipleChoices != test.output.info.MultipleChoices {
				t.Errorf("expected multiple choices %v, got %v", test.output.info.MultipleChoices, info.MultipleChoices)
			}
			if info.Duration != test.output.info.Duration {
				t.Errorf("expected duration %v, got %v", test.output.info.Duration, info.Duration)
			}
			if info.CreatedAt != test.output.info.CreatedAt {
				t.Errorf("expected created at %v, got %v", test.output.info.CreatedAt, info.CreatedAt)
			}
			if info.CreatedBy != test.output.info.CreatedBy {
				t.Errorf("expected created by %q, got %q", test.output.info.CreatedBy, info.CreatedBy)
			}
			if len(info.Results) != len(test.output.info.Results) {
				t.Errorf("expected %d results, got %d", len(test.output.info.Results), len(info.Results))
			}
			for i, result := range info.Results {
				if result.Option != test.output.info.Results[i].Option {
					t.Errorf("expected option %q, got %q", test.output.info.Results[i].Option, result.Option)
				}
				if result.Count != test.output.info.Results[i].Count {
					t.Errorf("expected votes %d, got %d", test.output.info.Results[i].Count, result.Count)
				}
				if result.HasUserVoted != test.output.info.Results[i].HasUserVoted {
					t.Errorf("expected has user voted %v, got %v", test.output.info.Results[i].HasUserVoted, result.HasUserVoted)
				}
			}
		})
	}
}

func setupTest() {
	polls = avl.NewTree()
	id = seqid.ID(0)
}

func stringInSlice(a string, list []string) bool {
	for _, b := range list {
		if b == a {
			return true
		}
	}
	return false
}
