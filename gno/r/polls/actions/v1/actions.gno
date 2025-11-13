package v1

import (
	"chain"

	"gno.land/p/nt/ufmt"
	"gno.land/p/zenao/daokit"
	feedsv1 "gno.land/p/zenao/feeds/v1"
	ma "gno.land/p/zenao/multiaddr"
	pollsv1 "gno.land/p/zenao/polls/v1"
	"gno.land/r/zenao/polls"
	"gno.land/r/zenao/social_feed"
)

const ActionNewPollKind = "gno.land/r/zenao/polls/actions/v1.NewPoll"

type ActionNewPoll struct {
	question string
	kind     pollsv1.PollKind
	options  []string
	duration int64
	authFn   polls.AuthFn
	feedID   string
}

func (a *ActionNewPoll) String() string {
	s := ufmt.Sprintf("Create new poll: %s\n", a.question)
	s += ufmt.Sprintf("Kind: %s\n", a.kind)
	s += ufmt.Sprintf("Options: %v\n", a.options)
	s += ufmt.Sprintf("Duration: %d seconds\n", a.duration)
	s += ufmt.Sprintf("Feed ID: %s\n", a.feedID)
	return s
}

func ActionNewPollHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionNewPollKind, func(i interface{}) {
		action, ok := i.(*ActionNewPoll)
		if !ok {
			panic("invalid action payload")
		}
		p := polls.NewPoll(cross, action.question, action.kind, action.duration, action.options, action.authFn)
		ma, err := ma.NewMultiaddr(social_feed.Protocols, ufmt.Sprintf("/poll/%d/gno/gno.land/r/zenao/polls", uint64(p.ID)))
		if err != nil {
			panic("multiaddr validation failed")
		}
		chain.Emit("zenao-poll-create", "pollID", ufmt.Sprintf("%d", uint64(p.ID)))
		post := &feedsv1.Post{
			Loc:  nil,
			Tags: []string{"poll"},
			Post: &feedsv1.LinkPost{
				Uri: ma.String(),
			},
		}
		postID := social_feed.NewPost(cross, action.feedID, post)
		chain.Emit("zenao-post-create", "postID", ufmt.Sprintf("%d", postID))
	})
}

func NewActionNewPoll(question string, kind pollsv1.PollKind, options []string, duration int64, authFn polls.AuthFn, feedID string) daokit.Action {
	return daokit.NewAction(ActionNewPollKind, &ActionNewPoll{
		question: question,
		kind:     kind,
		options:  options,
		duration: duration,
		authFn:   authFn,
		feedID:   feedID,
	})
}

const ActionVotePollKind = "gno.land/r/zenao/polls/actions/v1.VotePoll"

type ActionVotePoll struct {
	pollID uint64
	option string
}

func (a *ActionVotePoll) String() string {
	return ufmt.Sprintf("Vote on poll %d: option %s\n", a.pollID, a.option)
}

func ActionVotePollHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionVotePollKind, func(i interface{}) {
		action, ok := i.(*ActionVotePoll)
		if !ok {
			panic("invalid action payload")
		}
		polls.Vote(cross, action.pollID, action.option)
	})
}

func NewActionVotePoll(pollID uint64, option string) daokit.Action {
	return daokit.NewAction(ActionVotePollKind, &ActionVotePoll{
		pollID: pollID,
		option: option,
	})
}
