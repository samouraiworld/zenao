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

// Extension implements DAO.
func (c *crossingDAO) Extension(path string) Extension {
	return c.dao.Extension(path)
}

// ExtensionsList implements DAO.
func (c *crossingDAO) ExtensionsList() ExtensionsList {
	return c.dao.ExtensionsList()
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

func (c *crossingDAO) Render(path string) string {
	return c.Render(path)
}

var _ DAO = (*crossingDAO)(nil)
