package community_demo

import (
	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/communities"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
	"gno.land/r/demo/profile"
	"gno.land/r/zenao/social_feed"
)

var DAO daokit.DAO
var daoPrivate *basedao.DAOPrivate
var community *communities.Community

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
	}
	community = communities.NewCommunity(&conf)
	daoPrivate = community.DAOPrivate
	DAO = community.DAO
	social_feed.NewFeed(cross, "main", false, IsMember)
}

// Set public to be used as auth layer for external entities (e.g polls)
func IsMember(memberId string) bool {
	return daoPrivate.Members.IsMember(memberId)
}

func Vote(proposalID uint64, vote daocond.Vote) {
	DAO.Vote(proposalID, vote)
}

func Execute(proposalID uint64) {
	DAO.Execute(proposalID)
}

func Render(path string) string {
	return community.Render(path)
}
