package eventregscaling

import (
	"std"
	"strconv"

	zenaov1 "gno.land/p/zenao/zenao/v1"
	"gno.land/r/zenao/eventreg"
)

type InfoGetter func() *zenaov1.EventInfo

func Info() *zenaov1.EventInfo {
	return &zenaov1.EventInfo{
		Title:       "title",
		Description: "description",
		ImageUri:    "imageUri",
		StartDate:   100,
		EndDate:     200,
		Capacity:    2000,
		Organizers:  []string{"organizer1", "organizer2"},
		Location: &zenaov1.EventLocation{
			VenueName:    "venueName",
			Instructions: "instructions",
		},
		Participants: 1000,
		Privacy:      &zenaov1.EventPrivacy{},
	}
}

func GetRealm() string {
	addr := std.CurrentRealm()
	return addr.Address().String()
}

// Initialize will call AddParticipant n times
func Initialize(n int64) {
	eventPkgPath := "gno.land/r/zenao/eventregscaling"
	eventreg.Register(Info)
	eventreg.IndexEvent(eventPkgPath)
	for i := int64(0); i < n; i++ {
		userID := "user_" + strconv.FormatInt(i, 10)
		eventreg.AddParticipant(eventPkgPath, userID)
	}
}

func AddParticipant(eventPkgPath string, userID string) {
	eventreg.AddParticipant(eventPkgPath, userID)
}
