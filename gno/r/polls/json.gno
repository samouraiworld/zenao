package polls

import (
	"gno.land/p/onbloc/json"
	pollsv1 "gno.land/p/zenao/polls/v1"
)

func pollToJSON(poll *pollsv1.Poll) string {
	node := poll.ToJSON()
	bz, err := json.Marshal(node)
	if err != nil {
		panic(err)
	}
	return string(bz)
}
