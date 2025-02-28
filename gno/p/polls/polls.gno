package polls

import (
	"std"
	"time"

	"gno.land/p/demo/avl"
)

// XXX: Modify Answers by Choices

type Poll struct {
	Question        string
	MultipleAnswers bool
	Results         *avl.Tree // string -> avl.Tree of string -> struct{}

	StarTime int64
	EndTime  int64

	CreatedAt int64
	CreatedBy std.Address
}

type PollResult struct {
	Option string
	Votes  int
}

type PollInfo struct {
	Question string
	Options  []PollResult
}

func NewPoll(question string, multipleAnswers bool, start int64, end int64, options []string) *Poll {
	if len(options) < 2 {
		panic("poll must have at least 2 options")
	}
	if len(options) > 8 {
		panic("poll must have at most 8 options")
	}
	if end != 0 && start >= end {
		panic("start time must be before end time")
	}
	if start != 0 && start < time.Now().Unix() {
		panic("start time must be in the future")
	}
	if end != 0 && end < time.Now().Unix() {
		panic("end time must be in the future")
	}
	poll := &Poll{
		Question:        question,
		MultipleAnswers: multipleAnswers,
		Results:         avl.NewTree(),
		StarTime:        start,
		EndTime:         end,
		CreatedAt:       time.Now().Unix(),
		CreatedBy:       std.PreviousRealm().Address(),
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

// TODO: Add time validation
// TODO: Add validation for multiple answers
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

// TODO: Add start, end time, multiple answers, created at, created by
func (p *Poll) GetInfo() PollInfo {
	info := PollInfo{
		Question: p.Question,
		Options:  []PollResult{},
	}
	p.Results.Iterate("", "", func(key string, value interface{}) bool {
		votes := value.(*avl.Tree)
		info.Options = append(info.Options, PollResult{
			Option: key,
			Votes:  votes.Size(),
		})
		return false
	})
	return info
}
