package events

import (
	"std"
	"time"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/ownable"
	"gno.land/p/demo/seqid"
)

var (
	Ownable             *ownable.Ownable
	eventsByDate        avl.Tree // <date>/<event-pkg-path> -> event-pkg-path
	eventsByParticipant avl.Tree // <userId>/<event-pkg-path> -> event-pkg-path
)

func init() {
	initialOwner := std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94") // zenao-dev-admin
	Ownable = ownable.NewWithAddress(initialOwner)
}

func AddEvent(pkgPath string, startDate time.Time) {
	Ownable.AssertCallerIsOwner()

	key := timeKey(startDate) + "/" + pkgPath
	eventsByDate.Set(key, pkgPath)
}

func AddParticipant(userId string, pkgPath string) {
	Ownable.AssertCallerIsOwner()

	key := userId + "/" + pkgPath
	eventsByParticipant.Set(key, pkgPath)
}

func listEvents(from, to time.Time, limit uint32) []string {
	res := []string{}
	it := func(key string, value interface{}) bool {
		pkgPath := value.(string)
		res = append(pkgPath)
		return false
	}
	if from.After(to) {
		eventsByDate.ReverseIterate(timeKey(to), timeKey(from), it)
	} else {
		eventsByDate.Iterate(timeKey(from), timeKey(to), it)
	}
}

func timeKey(t time.Time) string {
	return seqid.ID(t.Unix()).String()
}
