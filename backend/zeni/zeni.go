package zeni

import (
	"context"
	"crypto/ed25519"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/ringsaturn/tzf"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

const MaxPasswordLen = 128

type Plan string

const (
	FreePlan Plan = "free"
	ProPlan  Plan = "pro"
)

// Implements the flag.Value interface (for CLI)
func (p *Plan) String() string {
	return string(*p)
}

// Implements the flag.Value interface (for CLI & enforcing the plan value)
func (p *Plan) Set(value string) error {
	value = strings.ToLower(value)
	switch value {
	case string(FreePlan), string(ProPlan):
		*p = Plan(value)
		return nil
	default:
		return fmt.Errorf("invalid plan: %s (must be free or pro)", value)
	}
}

func (p Plan) IsValid() bool {
	return p == FreePlan || p == ProPlan
}

type AuthUser struct {
	ID     string
	Email  string
	Banned bool
}

type User struct {
	CreatedAt   time.Time
	ID          string
	AuthID      string
	DisplayName string
	Bio         string
	AvatarURI   string
	Plan        Plan
}

type Event struct {
	CreatedAt    time.Time
	ID           string
	Title        string
	Description  string
	StartDate    time.Time
	EndDate      time.Time
	ImageURI     string
	TicketPrice  float64
	Capacity     uint32
	CreatorID    string
	Location     *zenaov1.EventLocation
	PasswordHash string
}

type Feed struct {
	CreatedAt time.Time
	ID        string
	Slug      string
	EventID   string
}

type Post struct {
	CreatedAt time.Time
	ID        string
	Post      *feedsv1.Post
	UserID    string
	FeedID    string
	Reactions []*Reaction
}

type Poll struct {
	CreatedAt time.Time
	ID        string
	Question  string
	Kind      pollsv1.PollKind
	Duration  int64
	Results   []*pollsv1.PollResult
	PostID    string
	Votes     []*Vote
}

type Vote struct {
	CreatedAt time.Time
	ID        string
	UserID    string
	Option    string
}

type Reaction struct {
	CreatedAt time.Time
	ID        string
	PostID    string
	UserID    string
	Icon      string
}

type SoldTicket struct {
	Ticket  *Ticket
	BuyerID string
	UserID  string
	User    *User
	Checkin *Checkin
}

type Checkin struct {
	At           time.Time
	GatekeeperID string
	Signature    string
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

	CreateUser(authID string) (*User, error)
	GetUser(authID string) (*User, error)
	// XXX: add EnsureUsersExist

	EditUser(userID string, req *zenaov1.EditUserRequest) error
	PromoteUser(userID string, plan Plan) error
	UserRoles(userID string, eventID string) ([]string, error)
	GetAllUsers() ([]*User, error)

	CreateEvent(creatorID string, organizersIDs []string, req *zenaov1.CreateEventRequest) (*Event, error)
	EditEvent(eventID string, organizersIDs []string, req *zenaov1.EditEventRequest) (*Event, error)
	ValidatePassword(req *zenaov1.ValidatePasswordRequest) (bool, error)
	GetEvent(eventID string) (*Event, error)
	Participate(eventID string, buyerID string, userID string, ticketSecret string, password string, needPassword bool) error
	GetAllEvents() ([]*Event, error)
	GetEventByPollID(pollID string) (*Event, error)
	GetEventByPostID(postID string) (*Event, error)
	GetEventUsersWithRole(eventID string, role string) ([]*User, error)
	GetEventUserTickets(eventID string, userID string) ([]*SoldTicket, error)
	Checkin(pubkey string, gatekeeperID string, signature string) (*Event, error)

	CreateFeed(eventID string, slug string) (*Feed, error)
	GetFeed(eventID string, slug string) (*Feed, error)
	GetFeedByID(feedID string) (*Feed, error)

	CreatePost(postID string, feedID string, userID string, post *feedsv1.Post) (*Post, error)
	GetPostByID(postID string) (*Post, error)
	GetAllPosts() ([]*Post, error)
	ReactPost(userID string, req *zenaov1.ReactPostRequest) error

	CreatePoll(userID string, pollID, postID string, feedID string, post *feedsv1.Post, req *zenaov1.CreatePollRequest) (*Poll, error)
	VotePoll(userID string, req *zenaov1.VotePollRequest) error
	GetPollByPostID(postID string) (*Poll, error)
}

type Chain interface {
	FillAdminProfile()
	CreateUser(user *User) error
	EditUser(userID string, req *zenaov1.EditUserRequest) error
	UserAddress(userID string) string

	CreateEvent(eventID string, organizersIDs []string, req *zenaov1.CreateEventRequest, privacy *zenaov1.EventPrivacy) error
	EditEvent(eventID string, callerID string, organizersIDs []string, req *zenaov1.EditEventRequest, privacy *zenaov1.EventPrivacy) error
	Participate(eventID string, callerID string, participantID string, ticketPubkey string, eventSK ed25519.PrivateKey) error
	Checkin(eventID string, gatekeeperID string, req *zenaov1.CheckinRequest) error

	CreatePost(userID string, eventID string, post *feedsv1.Post) (postID string, err error)
	ReactPost(userID string, eventID string, req *zenaov1.ReactPostRequest) error
	CreatePoll(userID string, req *zenaov1.CreatePollRequest) (pollID, postID string, err error)
	VotePoll(userID string, req *zenaov1.VotePollRequest) error
}

type Auth interface {
	GetUser(ctx context.Context) *AuthUser
	GetUsersFromIDs(ctx context.Context, ids []string) ([]*AuthUser, error)

	EnsureUserExists(ctx context.Context, email string) (*AuthUser, error)
	EnsureUsersExists(ctx context.Context, emails []string) ([]*AuthUser, error)

	WithAuth() func(http.Handler) http.Handler
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
