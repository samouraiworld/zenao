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

var DAO daokit.DAO
var daoPrivate *basedao.DAOPrivate
var event *events.Event

func init() {
	zenaoAdmin := "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94"
	creator := "g126gx6p6d3da4ymef35ury6874j6kys044r7zlg" // replace w/ address of the user realm
	conf := events.Config{
		Creator:          creator,
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
	}
	event = events.NewEvent(&conf)
	daoPrivate = event.DAOPrivate
	DAO = event.DAO

	social_feed.NewFeed("event", false, event.DAOPrivate.Members.IsMember)
}

func Vote(proposalID uint64, vote daocond.Vote) {
	DAO.Vote(proposalID, vote)
}

func Execute(proposalID uint64) {
	DAO.Execute(proposalID)
}

func Render(path string) string {
	return event.Render(path)
}
