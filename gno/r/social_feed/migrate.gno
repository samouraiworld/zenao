package social_feed

import (
	"gno.land/p/nt/avl/rotree"
	"gno.land/p/nt/ownable"
)

var (
	Ownable = ownable.NewWithAddress(address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94")) // zenao-dev-admin
	Paused  = false
)

func ID() uint64 {
	return uint64(id)
}

func Pause(_ realm) {
	Ownable.AssertOwnedByPrevious()
	if Paused {
		panic("already paused")
	}
	Paused = true
}

func Unpause(_ realm) {
	Ownable.AssertOwnedByPrevious()
	if !Paused {
		panic("not paused")
	}
	Paused = false
}

func assertActive() {
	if Paused {
		panic("paused")
	}
}

func ReactionsTree() rotree.IReadOnlyTree {
	return rotree.Wrap(reactions, nil)
}

func UserReactionsTree() rotree.IReadOnlyTree {
	return rotree.Wrap(userReactions, nil)
}

func PostsTree() rotree.IReadOnlyTree {
	// pb objects are safe
	return rotree.Wrap(posts, nil)
}

func PostsByFeedTree() rotree.IReadOnlyTree {
	// pb objects are safe
	return rotree.Wrap(postsByFeed, nil)
}

func PostsByParentTree() rotree.IReadOnlyTree {
	// pb objects are safe
	return rotree.Wrap(postsByParent, nil)
}

func FeedsTree() rotree.IReadOnlyTree {
	// Feed is safe
	return rotree.Wrap(feeds, nil)
}

func FeedsByPostTree() rotree.IReadOnlyTree {
	return rotree.Wrap(feedsByPost, nil)
}
