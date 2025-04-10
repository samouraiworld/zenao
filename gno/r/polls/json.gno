package polls

import (
	"gno.land/p/demo/json"
	pollsv1 "gno.land/p/zenao/polls/v1"
)

func PollToJSON(poll *pollsv1.Poll) string {
	node := poll.ToJSON()
	bz, err := json.Marshal(node)
	if err != nil {
		panic(err)
	}
	return string(bz)
}
