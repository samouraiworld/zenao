package daocond

import (
	"errors"
	"math"

	"gno.land/p/demo/ufmt"
)

type roleCountCond struct {
	hasRoleFn func(memberId string, role string) bool
	count     uint64
	role      string
}

func RoleCount(count uint64, role string, hasRoleFn func(memberId string, role string) bool) Condition {
	if count == 0 {
		panic(errors.New("count must be greater than 0"))
	}
	if role == "" {
		panic(errors.New("role must not be empty"))
	}
	if hasRoleFn == nil {
		panic(errors.New("nil hasRoleFn"))
	}
	return &roleCountCond{
		count:     count,
		hasRoleFn: hasRoleFn,
		role:      role,
	}
}

// Eval implements Condition.
func (c *roleCountCond) Eval(ballot Ballot) bool {
	return c.totalVote(ballot, VoteYes) >= c.count
}

// Signal implements Condition.
func (c *roleCountCond) Signal(ballot Ballot) float64 {
	return math.Min(float64(c.totalVote(ballot, VoteYes))/float64(c.count), 1)
}

// Render implements Condition.
func (c *roleCountCond) Render() string {
	return ufmt.Sprintf("%d %s", c.count, c.role)
}

// RenderWithVotes implements Condition.
func (c *roleCountCond) RenderWithVotes(ballot Ballot) string {
	s := ""
	s += ufmt.Sprintf("%d members with role %s must vote yes\n\n", c.count, c.role)
	s += ufmt.Sprintf("Yes: %d/%d\n\n", c.totalVote(ballot, VoteYes), c.count)
	s += ufmt.Sprintf("No: %d/%d\n\n", c.totalVote(ballot, VoteNo), c.count)
	s += ufmt.Sprintf("Abstain: %d/%d\n\n", c.totalVote(ballot, VoteAbstain), c.count)
	return s
}

var _ Condition = (*roleCountCond)(nil)

func (c *roleCountCond) totalVote(ballot Ballot, vote Vote) uint64 {
	total := uint64(0)
	ballot.Iterate(func(voter string, v Vote) bool {
		if v == vote && c.hasRoleFn(voter, c.role) {
			total += 1
		}
		return false
	})
	return total
}
