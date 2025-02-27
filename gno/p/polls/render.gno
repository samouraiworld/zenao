package polls

import (
	"gno.land/p/demo/avl"
	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
)

func (p *Poll) Render() string {
	s := ""
	s += md.H1(p.Question)
	s += md.HorizontalRule()
	s += md.HorizontalRule()
	s += md.H2("Results")
	p.Results.Iterate("", "", func(option string, votes interface{}) bool {
		votesTree := votes.(*avl.Tree)
		s += md.BulletItem(option)
		s += md.BulletItem("Votes: " + ufmt.Sprintf("%d", votesTree.Size()))
		return true
	})
	return s
}
