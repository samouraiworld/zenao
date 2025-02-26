package social_feed

import (
	"std"

	"gno.land/p/demo/avl"
)

type Feed struct {
	crossNetwork bool
	authFunc     func(string) bool // func(address) -> bool
}

var feeds *avl.Tree // slug -> Feed

func init() {
	feeds = avl.NewTree()
}

func NewFeed(slug string, crossNetwork bool, authFunc func(string) bool) string {
	creator := std.PreviousRealm()
	feed := &Feed{
		crossNetwork: crossNetwork,
		authFunc:     authFunc,
	}
	feedId := creator.Address().String() + ":" + slug
	feeds.Set(feedId, feed)
	return feedId
}
