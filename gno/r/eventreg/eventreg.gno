package eventreg

import (
	"errors"
	"std"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/ownable"
	"gno.land/p/demo/seqid"
	"gno.land/p/zenao/events"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

// all dates are in unix seconds for easier interfacing with maketx call and vm/qeval

var (
	Ownable *ownable.Ownable

	registered          avl.Tree // <eventPkgPath> -> func() events.Info
	eventsByPkgPath     avl.Tree // <eventPkgPath> -> events.Info
	eventsByEndDate     avl.Tree // <endDateUnixSeconds>/<eventPkgPath> -> eventPkgPath
	eventsByParticipant avl.Tree // <participantID>/<endDateUnixSeconds>/<eventPkgPath> -> eventPkgPath
	eventsByOrganizer   avl.Tree // <organizerID>/<endDateUnixSeconds>/<eventPkgPath> -> eventPkgPath
	participantsByEvent avl.Tree // <eventPkgPath>/<participantID> -> participantID

	// TODO: Remove this when we have a better way to handle lookup by event address.
	eventsPkgPathByAddr avl.Tree // <eventAddr> -> pkgPath
)

func init() {
	Ownable = ownable.NewWithAddress(std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94")) // zenao-dev-admin
}

// XXX: split this package into eventreg and eventsindex

func Register(infoGetter events.InfoGetter) {
	pkgPath := std.PreviousRealm().PkgPath()

	if infoGetter == nil {
		registered.Remove(pkgPath)
		// XXX: remove from index??
		return
	}
	registered.Set(pkgPath, infoGetter)

	// TODO: Remove this when we have a better way to handle lookup by event address.
	addr := std.DerivePkgAddr(pkgPath)
	eventsPkgPathByAddr.Set(addr.String(), pkgPath)
}

func getInfo(pkgPath string) (*zenaov1.EventInfo, bool) {
	raw, ok := registered.Get(pkgPath)
	if !ok {
		return nil, false
	}
	return raw.(events.InfoGetter)(), true
}

func mustGetInfo(pkgPath string) *zenaov1.EventInfo {
	info, ok := getInfo(pkgPath)
	if !ok {
		panic(ErrEventNotFound)
	}
	return info
}

func IndexEvent(pkgPath string) {
	Ownable.AssertCallerIsOwner()

	if prev := getEventByPkgPath(pkgPath); prev != nil {
		panic("already added")
	}
	info := mustGetInfo(pkgPath)
	key := pkgPath
	eventsByPkgPath.Set(key, info)

	key = unixTimeKey(info.EndDate) + "/" + pkgPath
	eventsByEndDate.Set(key, pkgPath)

	for _, organizer := range info.Organizers {
		key = organizer + "/" + unixTimeKey(info.EndDate) + "/" + pkgPath
		eventsByOrganizer.Set(key, pkgPath)
	}
}

func UpdateIndex(pkgPath string) {
	Ownable.AssertCallerIsOwner()

	prevInfo := mustGetEventByPkgPath(pkgPath)

	info := mustGetInfo(pkgPath)
	eventsByPkgPath.Set(pkgPath, info)

	if prevInfo.EndDate != info.EndDate {
		key := unixTimeKey(prevInfo.EndDate) + "/" + pkgPath
		eventsByEndDate.Remove(key)

		newKey := unixTimeKey(info.EndDate) + "/" + pkgPath
		eventsByEndDate.Set(newKey, pkgPath)

		for _, organizer := range prevInfo.Organizers {
			key = organizer + "/" + unixTimeKey(prevInfo.EndDate) + "/" + pkgPath
			eventsByOrganizer.Remove(key)
		}

		for _, organizer := range info.Organizers {
			key = organizer + "/" + unixTimeKey(info.EndDate) + "/" + pkgPath
			eventsByOrganizer.Set(key, pkgPath)
		}

		startKey := pkgPath + "/"
		endKey := startKey[:len(startKey)-1] + string('/'+1)
		participantsByEvent.Iterate(startKey, endKey, func(key string, value interface{}) bool {
			userID := value.(string)

			key = userID + "/" + unixTimeKey(prevInfo.EndDate) + "/" + pkgPath
			eventsByParticipant.Remove(key)

			newKey = userID + "/" + unixTimeKey(info.EndDate) + "/" + pkgPath
			eventsByParticipant.Set(newKey, pkgPath)

			return false
		})
	} else if !sliceIsEqual(prevInfo.Organizers, info.Organizers) {
		for _, organizer := range prevInfo.Organizers {
			key := organizer + "/" + unixTimeKey(prevInfo.EndDate) + "/" + pkgPath
			eventsByOrganizer.Remove(key)
		}
		for _, organizer := range info.Organizers {
			key := organizer + "/" + unixTimeKey(info.EndDate) + "/" + pkgPath
			eventsByOrganizer.Set(key, pkgPath)
		}
	}
}

func RemoveIndex(pkgPath string) {
	Ownable.AssertCallerIsOwner()

	evt := mustGetEventByPkgPath(pkgPath)

	eventsByPkgPath.Remove(pkgPath)

	key := unixTimeKey(evt.EndDate) + "/" + pkgPath
	eventsByEndDate.Remove(key)

	for _, organizer := range evt.Organizers {
		key = organizer + "/" + unixTimeKey(evt.EndDate) + "/" + pkgPath
		eventsByOrganizer.Remove(key)
	}

	startKey := pkgPath + "/"
	endKey := startKey[:len(startKey)-1] + string('/'+1)
	participantsByEvent.Iterate(startKey, endKey, func(key string, value interface{}) bool {
		userID := value.(string)

		key = userID + "/" + unixTimeKey(evt.EndDate) + "/" + pkgPath
		eventsByParticipant.Remove(key)

		return false
	})
}

func AddParticipant(eventPkgPath string, userID string) {
	Ownable.AssertCallerIsOwner()

	evt := mustGetEventByPkgPath(eventPkgPath)

	key := userID + "/" + unixTimeKey(evt.EndDate) + "/" + eventPkgPath
	eventsByParticipant.Set(key, eventPkgPath)

	key = eventPkgPath + "/" + userID
	participantsByEvent.Set(key, userID)

	info := mustGetInfo(eventPkgPath)
	eventsByPkgPath.Set(eventPkgPath, info)
}

func RemoveParticipant(eventPkgPath string, userID string) {
	Ownable.AssertCallerIsOwner()

	evt := mustGetEventByPkgPath(eventPkgPath)

	key := userID + "/" + unixTimeKey(evt.EndDate) + "/" + eventPkgPath
	eventsByParticipant.Remove(key)

	key = eventPkgPath + "/" + userID
	participantsByEvent.Remove(key)

	info := mustGetInfo(eventPkgPath)
	eventsByPkgPath.Set(eventPkgPath, info)
}

var ErrEventNotFound = errors.New("event not found")

func getEventByPkgPath(pkgPath string) *zenaov1.EventInfo {
	raw, ok := eventsByPkgPath.Get(pkgPath)
	if !ok {
		return nil
	}
	info := raw.(*zenaov1.EventInfo)
	return info
}

func mustGetEventByPkgPath(pkgPath string) *zenaov1.EventInfo {
	evt := getEventByPkgPath(pkgPath)
	if evt == nil {
		panic(ErrEventNotFound)
	}
	return evt
}

// TODO: Remove this when we have a better way to handle lookup by event address.
func listEventsPkgPathByAddrs(addresses []string) []string {
	res := make([]string, 0, len(addresses))
	for _, addr := range addresses {
		if pkgPath, ok := eventsPkgPathByAddr.Get(addr); ok {
			res = append(res, pkgPath.(string))
		} else {
			panic("event not found for address: " + addr)
		}
	}
	return res
}

func listEvents(from, to int64, limit, offset uint32) []*zenaov1.EventInfo {
	fromKey := unixTimeKey(from) + "/"
	toKey := unixTimeKey(to) + "/"

	return listEventsInternal(&eventsByEndDate, false, fromKey, toKey, from > to, limit, offset)
}

func listEventsByOrganizer(organizerID string, from, to int64, limit, offset uint32) []*zenaov1.EventInfo {
	fromKey := organizerID + "/" + unixTimeKey(from) + "/"
	toKey := organizerID + "/" + unixTimeKey(to) + "/"

	return listEventsInternal(&eventsByOrganizer, false, fromKey, toKey, from > to, limit, offset)
}

func listEventsUndiscoverableByOrganizer(organizerID string, from, to int64, limit, offset uint32) []*zenaov1.EventInfo {
	fromKey := organizerID + "/" + unixTimeKey(from) + "/"
	toKey := organizerID + "/" + unixTimeKey(to) + "/"

	return listEventsInternal(&eventsByOrganizer, true, fromKey, toKey, from > to, limit, offset)
}

func listEventsByParticipant(participantID string, from, to int64, limit, offset uint32) []*zenaov1.EventInfo {
	fromKey := participantID + "/" + unixTimeKey(from) + "/"
	toKey := participantID + "/" + unixTimeKey(to) + "/"

	return listEventsInternal(&eventsByParticipant, false, fromKey, toKey, from > to, limit, offset)
}

func listEventsInternal(at avl.ITree, undiscoverablesOnly bool, fromKey string, toKey string, rev bool, limit, offset uint32) []*zenaov1.EventInfo {
	res := []*zenaov1.EventInfo{}
	count := uint32(0)
	it := func(key string, value interface{}) bool {
		var evt zenaov1.EventInfo
		switch val := value.(type) {
		case *zenaov1.EventInfo:
			evt = *val
			evt.PkgPath = key
		case string:
			evt = *mustGetEventByPkgPath(val)
			evt.PkgPath = val
		}

		if (!evt.Discoverable && !undiscoverablesOnly) || (evt.Discoverable && undiscoverablesOnly) {
			return false
		}
		if count < offset {
			count++
			return false
		}
		res = append(res, &evt)
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
	return seqid.ID(t).Binary()
}

func sliceIsEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i, v := range a {
		if v != b[i] {
			return false
		}
	}
	return true
}
