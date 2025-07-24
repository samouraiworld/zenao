package communityreg

import (
	"errors"
	"std"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/ownable"
	"gno.land/p/zenao/communities"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

var (
	Ownable *ownable.Ownable

	registered           avl.Tree // <communityPkgPath> -> func() communities.Info
	communityesByMembers avl.Tree // <memberID>/<communityPkgPath> -> communityPkgPath
	communitiesByPkgPath avl.Tree // <communityPkgPath> -> communities.Info

	ErrCommunityNotFound = errors.New("community not found")
)

func init() {
	Ownable = ownable.NewWithAddress(std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94")) // zenao-dev-admin
}

// XXX: split this package into communityreg and communitiesindex

func Register(infoGetter communities.InfoGetter) {
	pkgPath := std.PreviousRealm().PkgPath()

	if infoGetter == nil {
		registered.Remove(pkgPath)
		// XXX: remove from index??
		return
	}

	registered.Set(pkgPath, infoGetter)
}

func getInfo(pkgPath string) (*zenaov1.CommunityInfo, bool) {
	raw, ok := registered.Get(pkgPath)
	if !ok {
		return nil, false
	}
	return raw.(communities.InfoGetter)(), true
}

func mustGetInfo(pkgPath string) *zenaov1.CommunityInfo {
	info, ok := getInfo(pkgPath)
	if !ok {
		panic(ErrCommunityNotFound)
	}
	return info
}

func IndexCommunity(pkgPath string) {
	Ownable.AssertCallerIsOwner()

	if prev := getCommunityByPkgPath(pkgPath); prev != nil {
		panic("community already indexed: " + pkgPath)
	}

	info := mustGetInfo(pkgPath)
	communitiesByPkgPath.Set(pkgPath, info)
}

func AddMember(communityPkgPath string, memberID string) {
	Ownable.AssertCallerIsOwner()

	if prev := getCommunityByPkgPath(communityPkgPath); prev == nil {
		panic("community not found: " + communityPkgPath)
	}

	key := memberID + "/" + communityPkgPath
	communityesByMembers.Set(key, communityPkgPath)
	info := mustGetInfo(communityPkgPath)
	communitiesByPkgPath.Set(communityPkgPath, info)
}

func RemoveMember(communityPkgPath string, memberID string) {
	Ownable.AssertCallerIsOwner()

	if prev := getCommunityByPkgPath(communityPkgPath); prev == nil {
		panic("community not found: " + communityPkgPath)
	}

	key := memberID + "/" + communityPkgPath
	communityesByMembers.Remove(key)
	info := mustGetInfo(communityPkgPath)
	communitiesByPkgPath.Set(communityPkgPath, info)
}

func getCommunityByPkgPath(pkgPath string) *zenaov1.CommunityInfo {
	raw, ok := communitiesByPkgPath.Get(pkgPath)
	if !ok {
		return nil
	}
	return raw.(*zenaov1.CommunityInfo)
}

func mustGetCommunityByPkgPath(pkgPath string) *zenaov1.CommunityInfo {
	info := getCommunityByPkgPath(pkgPath)
	if info == nil {
		panic(ErrCommunityNotFound)
	}
	return info
}

func listCommunities(limit, offset uint32) []*zenaov1.CommunityInfo {
	return listCommunitiesInternal(&communitiesByPkgPath, "", "", false, limit, offset)
}

func listCommunitiesByMembers(memberID string, limit, offset uint32) []*zenaov1.CommunityInfo {
	// ff is 255 in hex, which is the highest byte value, so it will match all keys that start with memberID.
	fromKey := memberID + "/"
	toKey := memberID + "/\xff"

	return listCommunitiesInternal(&communityesByMembers, fromKey, toKey, false, limit, offset)
}

func listCommunitiesInternal(at avl.ITree, fromKey string, toKey string, rev bool, limit, offset uint32) []*zenaov1.CommunityInfo {
	res := []*zenaov1.CommunityInfo{}
	count := uint32(0)
	it := func(key string, value interface{}) bool {
		if count < offset {
			count++
			return false
		}
		var info zenaov1.CommunityInfo
		switch val := value.(type) {
		case *zenaov1.CommunityInfo:
			info = *val
		case string:
			info = *mustGetCommunityByPkgPath(val)
		}
		info.PkgPath = key
		res = append(res, &info)
		return uint32(len(res)) >= limit
	}
	if rev {
		at.ReverseIterate(toKey, fromKey, it)
	} else {
		at.Iterate(fromKey, toKey, it)
	}
	return res
}
