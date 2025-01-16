package events

import (
	"std"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/ownable"
	"gno.land/p/demo/seqid"
)

// all dates are in unix seconds for easier interfacing with maketx call and vm/qeval

var (
	Ownable             *ownable.Ownable
	eventsByEndDate     avl.Tree // <date>/<event-pkg-path> -> event-pkg-path
	eventsByParticipant avl.Tree // <userID>/<date>/<event-pkg-path> -> event-pkg-path
	eventsByCreator     avl.Tree // <creatorID>/<date>/<event-pkg-path> -> event-pkg-path
)

func init() {
	initialOwner := std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94") // zenao-dev-admin
	Ownable = ownable.NewWithAddress(initialOwner)
}

func AddEvent(pkgPath string, creatorID string, endDate int64) {
	Ownable.AssertCallerIsOwner()

	{
		key := unixTimeKey(endDate) + "/" + pkgPath
		eventsByEndDate.Set(key, pkgPath)
	}

	{
		key := creatorID + "/" + unixTimeKey(endDate) + "/" + pkgPath
		eventsByCreator.Set(key, pkgPath)
	}
}

func AddParticipant(userID string, pkgPath string, endDate int64) {
	Ownable.AssertCallerIsOwner()

	key := userID + "/" + unixTimeKey(endDate) + "/" + pkgPath
	eventsByParticipant.Set(key, pkgPath)
}

func listEvents(from, to int64, limit uint32) []string {
	fromKey := unixTimeKey(from)
	toKey := unixTimeKey(to)

	return listEventsInternal(&eventsByEndDate, fromKey, toKey, from > to, limit)
}

func listEventsByCreator(creatorID string, from, to int64, limit uint32) []string {
	fromKey := creatorID + "/" + unixTimeKey(from)
	toKey := creatorID + "/" + unixTimeKey(to)

	return listEventsInternal(&eventsByCreator, fromKey, toKey, from > to, limit)
}

func listEventsByParticipant(userID string, from, to int64, limit uint32) []string {
	fromKey := userID + "/" + unixTimeKey(from)
	toKey := userID + "/" + unixTimeKey(to)

	return listEventsInternal(&eventsByParticipant, fromKey, toKey, from > to, limit)
}

func listEventsInternal(at *avl.Tree, fromKey string, toKey string, rev bool, limit uint32) []string {
	res := []string{}
	it := func(key string, value interface{}) bool {
		pkgPath := value.(string)
		res = append(res, pkgPath)
		return uint32(len(res)) >= limit
	}
	if rev {
		at.ReverseIterate(toKey, fromKey, it)
	} else {
		at.Iterate(fromKey, toKey, it)
	}
	return res
}

func unixTimeKey(t int64) string {
	if t < 0 {
		panic("negative unix time")
	}
	return seqid.ID(t).String()
}
