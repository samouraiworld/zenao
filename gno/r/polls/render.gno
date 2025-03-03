package polls

import (
	"gno.land/p/demo/avl"
	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
)

func Render(path string) string {
	return "TODO"
}

// TODO: Add informations like start, end, multiple answers, created by, created at
func (p *Poll) Render() string {
	s := ""
	s += md.H1(p.Question)
	s += md.HorizontalRule()
	s += md.H2("Results")
	p.Results.Iterate("", "", func(option string, votes interface{}) bool {
		votesTree := votes.(*avl.Tree)
		s += md.BulletItem(md.Bold(option)) + "\n" +
			"  " + md.BulletItem("Votes: "+ufmt.Sprintf("%d", votesTree.Size()))
		return false
	})
	return s
}
