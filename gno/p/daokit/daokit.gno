package daokit

import (
	"time"

	"gno.land/p/zenao/daocond"
)

type DAO interface {
	Propose(req ProposalRequest) uint64
	Execute(id uint64)
	Vote(id uint64, vote daocond.Vote)
}

func InstantExecute(d DAO, req ProposalRequest) uint64 {
	id := d.Propose(req)
	d.Vote(id, daocond.VoteYes)
	d.Execute(id)
	return id
}

type Core struct {
	Resources *ResourcesStore
	Proposals *ProposalsStore
	NoEvents  bool
}

func NewCore() *Core {
	return &Core{
		Resources: NewResourcesStore(),
		Proposals: NewProposalsStore(),
	}
}

func (d *Core) Vote(voterID string, proposalID uint64, vote daocond.Vote) {
	proposal := d.Proposals.GetProposal(proposalID)
	if proposal == nil {
		panic("proposal not found")
	}

	if proposal.Status != ProposalStatusOpen {
		panic("proposal is not open")
	}

	if !d.NoEvents {
		e := &daocond.EventVote{
			VoterID: voterID,
			Vote:    daocond.Vote(vote),
		}
		proposal.ConditionState.HandleEvent(e, proposal.Votes)
	}

	proposal.Votes[voterID] = daocond.Vote(vote)

}

func (d *Core) Execute(proposalID uint64) {
	proposal := d.Proposals.GetProposal(proposalID)
	if proposal == nil {
		panic("proposal not found")
	}

	if proposal.Status != ProposalStatusOpen {
		panic("proposal is not open")
	}

	if !proposal.ConditionState.Eval(proposal.Votes) {
		panic("proposal condition is not met")
	}

	proposal.UpdateStatus()
	if proposal.Status != ProposalStatusPassed {
		panic("proposal does not meet the condition(s) or is already closed/executed")
	}

	d.Resources.Get(proposal.Message.Type()).Handler.Execute(proposal.Message)
	proposal.Status = ProposalStatusExecuted
	proposal.ExecutedAt = time.Now()
}

func (d *Core) Propose(proposerID string, req ProposalRequest) uint64 {
	messageType := req.Message.Type()

	resource := d.Resources.Get(messageType)
	if resource == nil {
		panic("message type " + messageType + " not registered")
	}

	prop := d.Proposals.newProposal(proposerID, req, resource.Condition.NewState())
	return uint64(prop.ID)
}

func (d *Core) ResourcesCount() int {
	return d.Resources.Tree.Size()
}
