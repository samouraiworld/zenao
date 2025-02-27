package polls

import (
	"std"

	"gno.land/p/demo/avl"
)

type Poll struct {
	Question string
	Results  *avl.Tree // string -> avl.Tree of string -> struct{}
}

type PollResult struct {
	Option string
	Votes  int
}

type PollInfo struct {
	Question string
	Options  []PollResult
}

func NewPoll(id, question string, options []string) *Poll {
	if len(options) < 2 {
		panic("poll must have at least 2 options")
	}
	if len(options) > 8 {
		panic("poll must have at most 8 options")
	}
	poll := &Poll{
		Question: question,
		Results:  avl.NewTree(),
	}
	for _, option := range options {
		if option == "" {
			panic("option cannot be empty")
		}
		if len(option) > 32 {
			panic("option cannot be longer than 32 characters")
		}
		if poll.Results.Has(option) {
			panic("duplicate option")
		}
		poll.Results.Set(option, avl.NewTree())
	}
	return poll
}

func (p *Poll) Vote(addr std.Address, option string) {
	optionRaw, ok := p.Results.Get(option)
	if !ok {
		panic("invalid option")
	}
	votes := optionRaw.(*avl.Tree)
	if votes.Has(addr.String()) {
		votes.Remove(addr.String())
	} else {
		votes.Set(addr.String(), struct{}{})
	}
}
