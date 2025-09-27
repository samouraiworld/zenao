package polls

import (
	"std"
	"testing"
	"time"

	"gno.land/p/nt/avl"
	"gno.land/p/nt/seqid"
	"gno.land/p/nt/testutils"
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
				duration: int64(time.Minute) * 30 / int64(time.Second),
			},
			output: output{
				panic: false,
			},
		},
		"not enough options": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red"},
				duration: int64(time.Minute) * 30 / int64(time.Second),
			},
			output: output{
				panic: true,
			},
		},
		"too many options": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black"},
				duration: int64(time.Minute) * 30 / int64(time.Second),
			},
			output: output{
				panic: true,
			},
		},
		"empty option": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "", "green"},
				duration: int64(time.Minute) * 30 / int64(time.Second),
			},
			output: output{
				panic: true,
			},
		},
		"long option": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "this option is too too too too too too long"},
				duration: int64(time.Minute) * 30 / int64(time.Second),
			},
			output: output{
				panic: true,
			},
		},
		"duplicate option": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green", "blue"},
				duration: int64(time.Minute) * 30 / int64(time.Second),
			},
			output: output{
				panic: true,
			},
		},
		"duration less than 15 minutes": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green"},
				duration: int64(time.Minute) * 10 / int64(time.Second),
			},
			output: output{
				panic: true,
			},
		},
		"duration more than 1 month": {
			input: input{
				question: "What is your favorite color?",
				options:  []string{"red", "blue", "green"},
				duration: int64(time.Hour) * 24 * 30 * 2 / int64(time.Second),
			},
			output: output{
				panic: true,
			},
		},
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			r := revive(func() {
				NewPoll(cross, test.input.question, pollsv1.POLL_KIND_MULTIPLE_CHOICE, test.input.duration, test.input.options, nil)
			})
			if r != nil && !test.output.panic {
				t.Errorf("unexpected panic: %v", r)
			}
			if r == nil && test.output.panic {
				t.Errorf("expected panic")
			}
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

	pvFunc := func(addr string) bool {
		if addr == bob.String() {
			return true
		}
		return false

	}
	_ = NewPoll(cross, "What is your favorite color?", pollsv1.POLL_KIND_MULTIPLE_CHOICE, int64(time.Hour)/int64(time.Second), []string{"red", "blue", "green"}, nil)
	_ = NewPoll(cross, "What is your favorite color?", pollsv1.POLL_KIND_MULTIPLE_CHOICE, int64(time.Hour)/int64(time.Second), []string{"red", "blue", "green"}, pvFunc)
	_ = NewPoll(cross, "What is your favorite color?", pollsv1.POLL_KIND_SINGLE_CHOICE, int64(time.Hour)/int64(time.Second), []string{"red", "blue", "green"}, nil)

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
		/*
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
		*/
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
		/*
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
		*/
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
			testing.SetOriginCaller(test.input.caller)
			Vote(cross, test.input.id, test.input.option)
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

	poll := NewPoll(cross, "What is your favorite color?", pollsv1.POLL_KIND_MULTIPLE_CHOICE, int64(time.Hour)/int64(time.Second), []string{"red", "blue", "green"}, nil)
	emptyPoll := NewPoll(cross, "What is your favorite color?", pollsv1.POLL_KIND_MULTIPLE_CHOICE, int64(time.Hour)/int64(time.Second), []string{"red", "blue", "green"}, nil)
	testing.SetOriginCaller(alice)
	Vote(cross, 1, "blue")
	testing.SetOriginCaller(bob)
	Vote(cross, 1, "blue")
	testing.SetOriginCaller(carol)
	Vote(cross, 1, "red")

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
					Kind:      pollsv1.POLL_KIND_MULTIPLE_CHOICE,
					Duration:  int64(time.Hour) / int64(time.Second),
					CreatedAt: poll.CreatedAt,
					CreatedBy: poll.CreatedBy.String(),
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
					Kind:      pollsv1.POLL_KIND_MULTIPLE_CHOICE,
					Duration:  int64(time.Hour) / int64(time.Second),
					CreatedAt: poll.CreatedAt,
					CreatedBy: poll.CreatedBy.String(),
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
					Kind:      pollsv1.POLL_KIND_MULTIPLE_CHOICE,
					Duration:  int64(time.Hour) / int64(time.Second),
					CreatedAt: emptyPoll.CreatedAt,
					CreatedBy: emptyPoll.CreatedBy.String(),
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
			if info.Kind != test.output.info.Kind {
				t.Errorf("expected poll kind %v, got %v", test.output.info.Kind, info.Kind)
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
