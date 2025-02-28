package poll_demo

import (
	"std"
	"strconv"

	"gno.land/p/demo/json"
	"gno.land/p/zenao/polls"
)

var poll *polls.Poll

func init() {
	question := "What is your favorite color?"
	answers := []string{"Red", "Green", "Blue", "Yellow"}
	poll = polls.NewPoll(question, true, 0, 0, answers)
}

func Vote(answer string) {
	caller := std.PreviousRealm().Address()
	poll.Vote(caller, answer)
}

func GetInfoJSON() string {
	info := poll.GetInfo()
	var options []*json.Node
	for _, option := range info.Options {
		options = append(options, json.ObjectNode("", map[string]*json.Node{
			"option": json.StringNode("", option.Option),
			"votes":  json.StringNode("", strconv.FormatInt(int64(option.Votes), 10)),
		}))
	}
	return json.ObjectNode("", map[string]*json.Node{
		"question": json.StringNode("", info.Question),
		"options":  json.ArrayNode("", options),
	}).String()
}

func Render(path string) string {
	return poll.Render()
}

// make the target kind constants in a standalone pkg with doc. associated for each kind
// // implement teritori social feed API
// func FeedLinkTargetKind() string {
// 	return "poll"
// }
