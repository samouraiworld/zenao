package daokit

import "gno.land/p/zenao/daocond"

type CrossFn func(cur realm, cb func())

func NewCrossing(dao DAO, crossFn CrossFn) DAO {
	return &crossingDAO{dao: dao, crossFn: crossFn}
}

type crossingDAO struct {
	dao     DAO
	crossFn CrossFn
}

func (c *crossingDAO) Vote(proposalID uint64, vote daocond.Vote) {
	c.crossFn(cross, func() {
		c.dao.Vote(proposalID, vote)
	})
}

func (c *crossingDAO) Execute(proposalID uint64) {
	c.crossFn(cross, func() {
		c.dao.Execute(proposalID)
	})
}

func (c *crossingDAO) Propose(req ProposalRequest) uint64 {
	var id uint64
	c.crossFn(cross, func() {
		id = c.dao.Propose(req)
	})
	return id
}

var _ DAO = (*crossingDAO)(nil)
