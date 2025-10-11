package event_demo

import (
	"time"

	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/events"
	zenaov1 "gno.land/p/zenao/zenao/v1"
	"gno.land/r/demo/profile"
	"gno.land/r/zenao/social_feed"
)

var (
	DAO      daokit.DAO
	localDAO daokit.DAO

	event  *events.Event // XXX: needed for backward compatibility with frontend queries
	feedId string        // XXX: workaround for "unexpected zero object id" issue
)

func init() {
	// XXX: workaround for "unexpected zero object id" issue
	feedId = social_feed.NewFeed(cross, "main", false, feedAuth)
}

func init() {
	zenaoAdmin := "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94"
	creator := "g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5" // replace w/ address of the user realm
	conf := events.Config{
		Organizers:       []string{creator},
		Title:            "Demo",
		Description:      "This is a demo zenao event",
		ImageURI:         "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Wiki-IMG_20200904_200004436.jpg/640px-Wiki-IMG_20200904_200004436.jpg",
		StartDate:        time.Now().Add(48 * time.Hour).Unix(),
		EndDate:          time.Now().Add(96 * time.Hour).Unix(),
		Capacity:         500,
		GetProfileString: profile.GetStringField,
		SetProfileString: profile.SetStringField,
		ZenaoAdminAddr:   zenaoAdmin,
		Location:         &zenaov1.EventLocation{Address: &zenaov1.AddressCustom{Address: "To be disclosed", Timezone: "Europe/Paris"}},
		Discoverable:     true,
		CrossFn:          crossFn,
		SetImplemFn:      setImplem,
		FeedId:           feedId,
		PrivateVarName:   "event",
	}
	event = events.NewEvent(&conf)
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

func feedAuth() (string, bool) {
	caller := event.DAOPrivate.CallerID() // XXX: this should be upgradable
	return caller, basedao.MustGetMembersViewExtension(localDAO).IsMember(caller)
}

func crossFn(_ realm, cb func()) {
	cb()
}

func setImplem(newLocalDAO daokit.DAO, newDAO daokit.DAO) {
	localDAO, DAO = newLocalDAO, newDAO
}
