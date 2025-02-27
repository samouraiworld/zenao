package polls

import (
	"gno.land/p/moul/md"
)

func (p *Poll) Render() string {

	md.H1(p.Question)
	md.HorizontalRule()
	md.HorizontalRule()
	md.H2("Results")
	return ""
}
