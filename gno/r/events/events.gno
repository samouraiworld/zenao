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
	eventsByEndDate     avl.Tree // <date>/<event-pkg-path> -> event-pkg-path
	eventsByParticipant avl.Tree // <userID>/<date>/<event-pkg-path> -> event-pkg-path
	eventsByCreator     avl.Tree // <creatorID>/<date>/<event-pkg-path> -> event-pkg-path
)

func init() {
	initialOwner := std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94") // zenao-dev-admin
	Ownable = ownable.NewWithAddress(initialOwner)
}

func AddEvent(pkgPath string, creatorID string, endDate time.Time) {
	Ownable.AssertCallerIsOwner()

	{
		key := timeKey(endDate) + "/" + pkgPath
		eventsByEndDate.Set(key, pkgPath)
	}

	{
		key := creatorID + "/" + timeKey(endDate) + "/" + pkgPath
		eventsByCreator.Set(key, pkgPath)
	}
}

func AddParticipant(userID string, pkgPath string, endDate time.Time) {
	Ownable.AssertCallerIsOwner()

	key := userID + "/" + timeKey(endDate) + "/" + pkgPath
	eventsByParticipant.Set(key, pkgPath)
}

func listEvents(from, to time.Time, limit uint32) []string {
	fromKey := timeKey(from)
	toKey := timeKey(to)

	return listEventsInternal(&eventsByEndDate, fromKey, toKey, from.After(to), limit)
}

func listEventsByCreator(creatorID string, from, to time.Time, limit uint32) []string {
	fromKey := creatorID + "/" + timeKey(from)
	toKey := creatorID + "/" + timeKey(to)

	return listEventsInternal(&eventsByCreator, fromKey, toKey, from.After(to), limit)
}

func listEventsByParticipant(userID string, from, to time.Time, limit uint32) []string {
	fromKey := userID + "/" + timeKey(from)
	toKey := userID + "/" + timeKey(to)

	return listEventsInternal(&eventsByParticipant, fromKey, toKey, from.After(to), limit)
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

func timeKey(t time.Time) string {
	return seqid.ID(t.Unix()).String()
}
