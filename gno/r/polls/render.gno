package polls

import (
	"time"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/mux"
	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	pollsv1 "gno.land/p/zenao/polls/v1"
)

var router *mux.Router

const PollsPagePath = ""
const DetailPollPagePath = "{id}"

func init() {
	router = mux.NewRouter()
	router.HandleFunc(PollsPagePath, PollsPageHandler)
	router.HandleFunc(DetailPollPagePath, DetailPollPageHandler)
}

func Render(path string) string {
	return router.Render(path)
}

func PollsPageHandler(res *mux.ResponseWriter, req *mux.Request) {
	res.Write(md.H1("Welcome to the polls factory 🏭"))
	res.Write(md.H3("Here are the latest (20. max) polls:"))
	i := 0
	polls.Iterate("", "", func(id string, pollRaw interface{}) bool {
		poll := pollRaw.(*Poll)
		res.Write(md.BulletItem(md.Link(poll.Question, "polls:"+id)))
		i++
		if i >= 20 {
			return true
		}
		return false
	})
	res.Write(md.HorizontalRule())
	res.Write(md.Link("Create a new poll 🗳️", "polls$help#func-NewPoll"))
}

func DetailPollPageHandler(res *mux.ResponseWriter, req *mux.Request) {
	id := req.GetVar("id")
	pollRaw, ok := polls.Get(id)
	if !ok {
		res.Write(md.H1("Poll not found"))
		return
	}
	poll := pollRaw.(*Poll)
	res.Write(poll.Render())
}

func (p *Poll) Render() string {
	s := ""
	s += md.H1(p.Question + "❓")
	if p.Kind == pollsv1.POLL_KIND_MULTIPLE_CHOICE {
		s += md.Paragraph("Multiple choices allowed ✅")
	} else {
		s += md.Paragraph("Only one choice allowed ❌")
	}
	s += md.Paragraph(md.Italic("Duration: " + time.Duration(p.Duration).String() + "⌛"))
	s += md.Paragraph(md.Italic("Created by " + p.CreatedBy.String() + "👤"))
	s += md.Paragraph(md.Italic("Created at " + time.Unix(p.CreatedAt, 0).Format("2006-01-02 15:04:05") + "🕒"))
	s += md.HorizontalRule()
	s += md.H2("Results:  📊")
	p.Results.Iterate("", "", func(option string, choices interface{}) bool {
		choicesTree := choices.(*avl.Tree)
		s += md.BulletItem(md.Bold(option)) + "\n" +
			"  " + md.BulletItem("Votes: "+ufmt.Sprintf("%d", choicesTree.Size()))
		return false
	})
	return s
}
