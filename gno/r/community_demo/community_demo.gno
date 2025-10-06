package community_demo

import (
	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/communities"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
	"gno.land/r/demo/profile"
	"gno.land/r/zenao/social_feed"
)

var (
	DAO      daokit.DAO
	localDAO daokit.DAO

	community *communities.Community // XXX: needed for backward compatibility with frontend queries
	feedId    string                 // XXX: workaround for "unexpected zero object id" issue
)

func init() {
	feedId = social_feed.NewFeed(cross, "main", false, isMember) // XXX: workaround for "unexpected zero object id" issue
}

func init() {
	zenaoAdmin := "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94"
	creator := "g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5" // replace w/ address of the user realm
	conf := communities.Config{
		ZenaoAdminAddr:   zenaoAdmin,
		Administrators:   []string{creator},
		Members:          []string{},
		Events:           []string{},
		DisplayName:      "Demo Community",
		Description:      "This is a demo community for Zenao",
		AvatarURI:        "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Wiki-IMG_20200904_200004436.jpg/640px-Wiki-IMG_20200904_200004436.jpg",
		BannerURI:        "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Wiki-IMG_20200904_200004436.jpg/640px-Wiki-IMG_20200904_200004436.jpg",
		GetProfileString: profile.GetStringField,
		SetProfileString: profile.SetStringField,
		CrossFn:          crossFn,
		SetImplemFn:      setImplem,
		FeedId:           feedId,
		PrivateVarName:   "community",
	}
	community = communities.NewCommunity(&conf)
}

func Vote(_ realm, proposalID uint64, vote daocond.Vote) {
	localDAO.Vote(proposalID, vote)
}

func Execute(_ realm, proposalID uint64) {
	localDAO.Execute(proposalID)
}

func Render(path string) string {
	return localDAO.Render(path)
}

func isMember(memberId string) bool {
	return basedao.MustGetMembersViewExtension(localDAO).IsMember(memberId)
}

func crossFn(_ realm, cb func()) {
	cb()
}

func setImplem(newLocalDAO daokit.DAO, newDAO daokit.DAO) {
	localDAO, DAO = newLocalDAO, newDAO
}
