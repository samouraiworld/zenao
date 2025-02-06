package eventreg

import (
	"std"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/ownable"
	"gno.land/p/demo/seqid"
)

// all dates are in unix seconds for easier interfacing with maketx call and vm/qeval

var (
	Ownable             *ownable.Ownable
	eventsByEndDate     avl.Tree // <endDateUnixSeconds>/<eventID> -> eventID
	eventsByParticipant avl.Tree // <participantID>/<endDateUnixSeconds>/<eventID> -> eventID
	eventsByCreator     avl.Tree // <creatorID>/<endDateUnixSeconds>/<eventID> -> eventID
)

func init() {
	initialOwner := std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94") // zenao-dev-admin
	Ownable = ownable.NewWithAddress(initialOwner)
}

func AddEvent(eventID string, creatorID string, eventEndDate int64) {
	Ownable.AssertCallerIsOwner()

	{
		key := unixTimeKey(eventEndDate) + "/" + eventID
		eventsByEndDate.Set(key, eventID)
	}

	{
		key := creatorID + "/" + unixTimeKey(eventEndDate) + "/" + eventID
		eventsByCreator.Set(key, eventID)
	}
}

func AddParticipant(eventID string, userID string, eventEndDate int64) {
	Ownable.AssertCallerIsOwner()

	key := userID + "/" + unixTimeKey(eventEndDate) + "/" + eventID
	eventsByParticipant.Set(key, eventID)
}

func RemoveParticipant(eventID string, userID string, eventEndDate int64) {
	Ownable.AssertCallerIsOwner()

	key := userID + "/" + unixTimeKey(eventEndDate) + "/" + eventID
	eventsByParticipant.Remove(key)
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

func listEventsByParticipant(participantID string, from, to int64, limit uint32) []string {
	fromKey := participantID + "/" + unixTimeKey(from)
	toKey := participantID + "/" + unixTimeKey(to)

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
