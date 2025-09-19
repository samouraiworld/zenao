package daocond

import (
	"errors"
	"math"

	"gno.land/p/demo/ufmt"
)

type roleThresholdCond struct {
	hasRoleFn        func(memberId string, role string) bool
	usersRoleCountFn func(role string) uint32
	threshold        float64
	role             string
}

func RoleThreshold(threshold float64, role string, hasRoleFn func(memberId string, role string) bool, usersRoleCountFn func(role string) uint32) Condition {
	if threshold <= 0 || threshold > 1 {
		panic(errors.New("invalid threshold"))
	}
	if hasRoleFn == nil {
		panic(errors.New("nil hasRoleFn"))
	}
	if usersRoleCountFn == nil {
		panic(errors.New("nil usersRoleCountFn"))
	}
	return &roleThresholdCond{
		threshold:        threshold,
		hasRoleFn:        hasRoleFn,
		usersRoleCountFn: usersRoleCountFn,
		role:             role,
	}
}

// Eval implements Condition.
func (c *roleThresholdCond) Eval(ballot Ballot) bool {
	return c.voteRatio(ballot, VoteYes) >= c.threshold
}

// Signal implements Condition.
func (c *roleThresholdCond) Signal(ballot Ballot) float64 {
	return math.Min(c.voteRatio(ballot, VoteYes)/c.threshold, 1)
}

// Render implements Condition.
func (c *roleThresholdCond) Render() string {
	return ufmt.Sprintf("%g%% of %s members", c.threshold*100, c.role)
}

// RenderWithVotes implements Condition.
func (c *roleThresholdCond) RenderWithVotes(ballot Ballot) string {
	s := ""
	s += ufmt.Sprintf("%g%% of %s members with role %s must vote yes\n\n", c.threshold*100, c.role)
	s += ufmt.Sprintf("Yes: %d/%d = %g%%\n\n", c.totalVote(ballot, VoteYes), c.usersRoleCountFn(c.role), c.voteRatio(ballot, VoteYes)*100)
	s += ufmt.Sprintf("No: %d/%d = %g%%\n\n", c.totalVote(ballot, VoteNo), c.usersRoleCountFn(c.role), c.voteRatio(ballot, VoteNo)*100)
	s += ufmt.Sprintf("Abstain: %d/%d = %g%%\n\n", c.totalVote(ballot, VoteAbstain), c.usersRoleCountFn(c.role), c.voteRatio(ballot, VoteAbstain)*100)
	return s
}

var _ Condition = (*roleThresholdCond)(nil)

func (c *roleThresholdCond) voteRatio(ballot Ballot, vote Vote) float64 {
	return float64(c.totalVote(ballot, vote)) / float64(c.usersRoleCountFn(c.role))
}

func (c *roleThresholdCond) totalVote(ballot Ballot, vote Vote) uint32 {
	total := uint32(0)
	ballot.Iterate(func(voter string, v Vote) bool {
		if v == vote && c.hasRoleFn(voter, c.role) {
			total += 1
		}
		return false
	})
	return total
}
