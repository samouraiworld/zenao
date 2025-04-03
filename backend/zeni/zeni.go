package zeni

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ringsaturn/tzf"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

type AuthUser struct {
	ID     string
	Email  string
	Banned bool
}

type User struct {
	ID          string
	DisplayName string
	Bio         string
	AvatarURI   string
}

type Event struct {
	ID          string
	Title       string
	Description string
	StartDate   time.Time
	EndDate     time.Time
	ImageURI    string
	TicketPrice float64
	Capacity    uint32
	CreatorID   string
	Location    *zenaov1.EventLocation
}

type Feed struct {
	ID      string
	Slug    string
	EventID string
}

type Post struct {
	ID     string
	Post   *feedsv1.Post
	UserID string
	FeedID string
}

type Poll struct {
	ID       string
	Question string
	Kind     *pollsv1.PollKind
	Duration int64
	Results  []*pollsv1.PollResult
	PostID   string
}

var tzFinder tzf.F

func init() {
	var err error
	tzFinder, err = tzf.NewDefaultFinder()
	if err != nil {
		panic(err)
	}
}

func (e *Event) Timezone() (*time.Location, error) {
	switch val := e.Location.GetAddress().(type) {
	case *zenaov1.EventLocation_Virtual:
		return time.UTC, nil

	case *zenaov1.EventLocation_Custom:
		return time.LoadLocation(val.Custom.GetTimezone())

	case *zenaov1.EventLocation_Geo:
		name := tzFinder.GetTimezoneName(float64(val.Geo.Lng), float64(val.Geo.Lat))
		return time.LoadLocation(name)

	default:
		return nil, errors.New("unknown location kind")
	}
}

// authID is the user id coming from the auth system.
// userID is an internal zenao user id.
type DB interface {
	Tx(func(db DB) error) error

	CreateUser(authID string) (string, error)
	UserExists(authID string) (string, error)

	EditUser(userID string, req *zenaov1.EditUserRequest) error
	UserRoles(userID string, eventID string) ([]string, error)
	GetAllUsers() ([]*User, error)

	CreateEvent(creatorID string, req *zenaov1.CreateEventRequest) (*Event, error)
	EditEvent(eventID string, req *zenaov1.EditEventRequest) error
	GetEvent(eventID string) (*Event, error)
	Participate(eventID string, userID string) error
	GetAllEvents() ([]*Event, error)
	GetAllParticipants(eventID string) ([]*User, error)

	CreateFeed(eventID string, slug string) (*Feed, error)
	GetFeed(eventID string, slug string) (*Feed, error)
	CreatePost(postID string, feedID string, userID string, post *feedsv1.Post) (*Post, error)
	CreatePoll(pollID, postID string, req *zenaov1.CreatePollRequest) (*Poll, error)
}

type Chain interface {
	FillAdminProfile()
	CreateUser(user *User) error
	EditUser(userID string, req *zenaov1.EditUserRequest) error
	UserAddress(userID string) string

	CreateEvent(eventID string, creatorID string, req *zenaov1.CreateEventRequest) error
	EditEvent(eventID string, callerID string, req *zenaov1.EditEventRequest) error
	Participate(eventID string, callerID string, participantID string) error

	CreatePoll(userID string, req *zenaov1.CreatePollRequest) (pollID, postID string, err error)
	VotePoll(userID string, req *zenaov1.VotePollRequest) error
}

func LocationToString(location *zenaov1.EventLocation) (string, error) {
	if location == nil {
		return "", errors.New("nil location")
	}

	buf := &strings.Builder{}

	if location.VenueName != "" {
		buf.WriteString(location.VenueName)
		buf.WriteString(" - ")
	}

	switch val := location.Address.(type) {
	case *zenaov1.EventLocation_Virtual:
		buf.WriteString(val.Virtual.Uri)
	case *zenaov1.EventLocation_Geo:
		buf.WriteString(val.Geo.GetAddress())
		fmt.Fprintf(buf, "- %g, %g", val.Geo.Lat, val.Geo.Lng)
	case *zenaov1.EventLocation_Custom:
		buf.WriteString(val.Custom.GetAddress())
	default:
		return "", errors.New("unsupported address type")
	}

	return buf.String(), nil
}

func LocationKind(location *zenaov1.EventLocation) (string, error) {
	switch location.Address.(type) {
	case *zenaov1.EventLocation_Virtual:
		return "virtual", nil
	case *zenaov1.EventLocation_Geo:
		return "geo", nil
	case *zenaov1.EventLocation_Custom:
		return "custom", nil
	default:
		return "", errors.New("unsupported address type")
	}
}
