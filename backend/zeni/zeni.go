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

const (
	RoleOrganizer   string = "organizer"   // for events
	RoleGatekeeper  string = "gatekeeper"  // for events
	RoleParticipant string = "participant" // for events

	RoleAdministrator string = "administrator" // for communities
	RoleMember        string = "member"        // for communities
	RoleEvent         string = "event"         // for communities
)

const (
	EntityTypeUser      string = "user"
	EntityTypeEvent     string = "event"
	EntityTypeCommunity string = "community"
)

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
	CreatedAt         time.Time
	ID                string
	Title             string
	Description       string
	StartDate         time.Time
	EndDate           time.Time
	ImageURI          string
	TicketPrice       float64
	Capacity          uint32
	CreatorID         string
	Location          *zenaov1.EventLocation
	PasswordHash      string
	ICSSequenceNumber uint32
}

type Community struct {
	CreatedAt   time.Time
	ID          string
	DisplayName string
	Description string
	AvatarURI   string
	BannerURI   string
	CreatorID   string
}

type EntityRole struct {
	DeletedAt  time.Time
	EntityType string // one of: user, event
	EntityID   string
	OrgType    string // one of: event, community
	OrgID      string
	Role       string // one of: organizer, gatekeeper, participant, administrator, member,
}

type Feed struct {
	CreatedAt time.Time
	ID        string
	Slug      string
	OrgType   string // one of: event, community
	OrgID     string
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
	DeletedAt time.Time
	CreatedAt time.Time
	Ticket    *Ticket
	BuyerID   string
	UserID    string
	User      *User
	Checkin   *Checkin
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
	EntityRoles(entityType string, entityID string, orgType string, orgID string) ([]string, error)
	GetAllUsers() ([]*User, error)

	CreateEvent(creatorID string, organizersIDs []string, gatekeepersIDs []string, req *zenaov1.CreateEventRequest) (*Event, error)
	EditEvent(eventID string, organizersIDs []string, gatekeepersIDs []string, req *zenaov1.EditEventRequest) (*Event, error)
	ValidatePassword(req *zenaov1.ValidatePasswordRequest) (bool, error)
	GetEvent(eventID string) (*Event, error)
	Participate(eventID string, buyerID string, userID string, ticketSecret string, password string, needPassword bool) error
	CancelParticipation(eventID string, userID string) error
	GetAllEvents() ([]*Event, error)
	GetEventTickets(eventID string) ([]*SoldTicket, error)
	GetEventUserTicket(eventID string, userID string) (*SoldTicket, error)
	GetEventUserOrBuyerTickets(eventID string, userID string) ([]*SoldTicket, error)
	Checkin(pubkey string, gatekeeperID string, signature string) (*Event, error)

	CreateCommunity(creatorID string, administratorsIDs []string, membersIDs []string, eventsIDs []string, req *zenaov1.CreateCommunityRequest) (*Community, error)
	GetAllCommunities() ([]*Community, error)

	GetOrgUsersWithRole(orgType string, orgID string, role string) ([]*User, error)
	GetOrgsEventsWithRole(orgType string, orgID string, role string) ([]*Event, error)
	GetOrgByPollID(pollID string) (orgType, orgID string, err error)
	GetOrgByPostID(postID string) (orgType, orgID string, err error)

	CreateFeed(orgType string, orgID string, slug string) (*Feed, error)
	GetFeed(orgType string, orgID string, slug string) (*Feed, error)
	GetFeedByID(feedID string) (*Feed, error)

	CreatePost(postID string, feedID string, userID string, post *feedsv1.Post) (*Post, error)
	DeletePost(postID string) error
	EditPost(postID string, req *zenaov1.EditPostRequest) error
	GetPostByID(postID string) (*Post, error)
	GetAllPosts(getDeleted bool) ([]*Post, error)
	ReactPost(userID string, req *zenaov1.ReactPostRequest) error

	CreatePoll(userID string, pollID, postID string, feedID string, post *feedsv1.Post, req *zenaov1.CreatePollRequest) (*Poll, error)
	VotePoll(userID string, req *zenaov1.VotePollRequest) error
	GetPollByPostID(postID string) (*Poll, error)

	// gentxs specific
	GetDeletedOrgEntitiesWithRole(orgType string, orgID string, entityType string, role string) ([]*EntityRole, error)
	GetDeletedTickets(eventID string) ([]*SoldTicket, error)
}

type Chain interface {
	FillAdminProfile()
	CreateUser(user *User) error
	EditUser(userID string, req *zenaov1.EditUserRequest) error
	UserAddress(userID string) string
	EventAddress(eventID string) string

	CreateEvent(eventID string, organizersIDs []string, gatekeepersIDs []string, req *zenaov1.CreateEventRequest, privacy *zenaov1.EventPrivacy) error
	EditEvent(eventID string, callerID string, organizersIDs []string, gatekeepersIDs []string, req *zenaov1.EditEventRequest, privacy *zenaov1.EventPrivacy) error
	Participate(eventID string, callerID string, participantID string, ticketPubkey string, eventSK ed25519.PrivateKey) error
	CancelParticipation(eventID string, callerID string, participantID string, ticketPubkey string) error
	Checkin(eventID string, gatekeeperID string, req *zenaov1.CheckinRequest) error

	CreateCommunity(communityID string, administratorsIDs []string, membersIDs []string, eventsIDs []string, req *zenaov1.CreateCommunityRequest) error

	CreatePost(userID string, orgType string, orgID string, post *feedsv1.Post) (postID string, err error)
	DeletePost(userID string, postID string) error
	EditPost(userID string, postID string, post *feedsv1.Post) error
	ReactPost(userID string, orgType string, orgID string, req *zenaov1.ReactPostRequest) error
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
