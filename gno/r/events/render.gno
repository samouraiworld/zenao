package events

import "gno.land/p/moul/md"

func Render(path string) string {
	res := md.H1("Zenao Events")

	evts := []string{}
	eventsByEndDate.ReverseIterateByOffset(0, 50, func(key string, value interface{}) bool {
		evts = append(evts, key)
		return false
	})
	res += md.BulletList(evts)

	return res
}
