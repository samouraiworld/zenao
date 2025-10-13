package polls

import (
	"time"

	"gno.land/p/nt/avl"
	"gno.land/p/nt/seqid"
	pollsv1 "gno.land/p/zenao/polls/v1"
	"gno.land/p/zenao/realmid"
)

var (
	polls *avl.Tree // string (seqid.ID) -> *Poll
	id    seqid.ID
)

func init() {
	polls = avl.NewTree()
}

type AuthFn func() (userID string, authorized bool)

type Poll struct {
	ID       seqid.ID
	Question string
	Kind     pollsv1.PollKind
	Results  *avl.Tree // string (options) -> avl.Tree of string (realmid of users) -> struct{}

	Duration int64

	CreatedAt int64
	CreatedBy string

	authFunc AuthFn
}

func NewPoll(_ realm, question string, kind pollsv1.PollKind, duration int64, options []string, authFunc AuthFn) *Poll {
	if len(options) < 2 {
		panic("poll must have at least 2 options")
	}
	if len(options) > 8 {
		panic("poll must have at most 8 options")
	}
	minDuration := int64(time.Minute) * 15 / int64(time.Second)
	maxDuration := int64(time.Hour) * 24 * 30 / int64(time.Second)
	if duration < minDuration {
		panic("duration must be at least 15 minutes")
	}
	if duration > maxDuration {
		panic("duration must be at most 1 month")
	}
	poll := &Poll{
		ID:        id.Next(),
		Question:  question,
		Kind:      kind,
		Results:   avl.NewTree(),
		Duration:  duration,
		CreatedAt: time.Now().Unix(),
		CreatedBy: realmid.Previous(),
		authFunc:  authFunc,
	}
	for _, option := range options {
		if option == "" {
			panic("option cannot be empty")
		}
		if len(option) > 128 {
			panic("option cannot be longer than 128 characters")
		}
		if poll.Results.Has(option) {
			panic("duplicate option")
		}
		poll.Results.Set(option, avl.NewTree())
	}

	polls.Set(poll.ID.String(), poll)

	return poll
}

func Vote(cur realm, pollID uint64, option string) {
	id := seqid.ID(pollID)
	pollRaw, ok := polls.Get(id.String())
	if !ok {
		panic("poll not found")
	}

	poll := pollRaw.(*Poll)
	poll.Vote(cur, option)
}

func GetInfo(pollID uint64, user string) *pollsv1.Poll {
	id := seqid.ID(pollID)
	pollRaw, ok := polls.Get(id.String())
	if !ok {
		panic("poll not found")
	}
	poll := pollRaw.(*Poll)
	return poll.GetInfo(user)
}

func (p *Poll) Vote(_ realm, option string) {
	callerID := p.auth()

	optionRaw, ok := p.Results.Get(option)
	if !ok {
		panic("invalid option")
	}

	if !p.IsRunning() {
		panic("poll is not running")
	}

	// Remove previous choice if multiple answers are not allowed
	if p.Kind != pollsv1.POLL_KIND_MULTIPLE_CHOICE {
		p.Results.Iterate("", "", func(key string, value interface{}) bool {
			choices := value.(*avl.Tree)
			if choices.Has(callerID) {
				choices.Remove(callerID)
				return true
			}
			return false
		})
	}

	choices := optionRaw.(*avl.Tree)
	if choices.Has(callerID) {
		choices.Remove(callerID)
	} else {
		choices.Set(callerID, struct{}{})
	}
}

func (p *Poll) GetInfo(user string) *pollsv1.Poll {
	info := &pollsv1.Poll{
		Question:  p.Question,
		Results:   []*pollsv1.PollResult{},
		Kind:      p.Kind,
		Duration:  p.Duration,
		CreatedAt: p.CreatedAt,
		CreatedBy: p.CreatedBy,
	}
	p.Results.Iterate("", "", func(key string, value interface{}) bool {
		count := value.(*avl.Tree)
		info.Results = append(info.Results, &pollsv1.PollResult{
			Option:       key,
			Count:        uint32(count.Size()),
			HasUserVoted: count.Has(user),
		})
		return false
	})
	return info
}

func (p *Poll) IsRunning() bool {
	return time.Now().Unix() < p.CreatedAt+p.Duration
}

func (p *Poll) auth() string {
	if p.authFunc == nil {
		return realmid.Previous()
	}

	id, ok := p.authFunc()
	if !ok {
		panic("the user is not allowed to interact with this poll")
	}
	return id
}
