package polls

import (
	"testing"
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
