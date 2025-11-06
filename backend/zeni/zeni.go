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

// TODO: what we do with this
type User struct {
	CreatedAt   time.Time
	ID          string
	AuthID      string
	RealmID     string
	DisplayName string //TODO: to remove
	Bio         string //TODO: to remove
	AvatarURI   string //TODO: to remove
	Plan        Plan
}

// TODO: TO DELETE
type Event struct {
	CreatedAt         time.Time
	DeletedAt         time.Time
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
	Discoverable      bool
}

// TODO: TO DELETE
type Community struct {
	CreatedAt   time.Time
	ID          string
	DisplayName string
	Description string
	AvatarURI   string
	BannerURI   string
	CreatorID   string
}

// TODO: TO DELETE
type EntityRole struct {
	CreatedAt  time.Time
	DeletedAt  time.Time
	EntityType string // one of: user, event
	EntityID   string
	OrgType    string // one of: event, community
	OrgID      string
	Role       string // one of: organizer, gatekeeper, participant, administrator, member,
}

// TODO: TO DELETE
type Feed struct {
	CreatedAt time.Time
	ID        string
	Slug      string
	OrgType   string // one of: event, community
	OrgID     string
}

// TODO: TO DELETE
type Post struct {
	CreatedAt time.Time
	ID        string
	Post      *feedsv1.Post
	UserID    string
	FeedID    string
	Reactions []*Reaction
}

// TODO: TO DELETE
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

// TODO: TO DELETE
type Vote struct {
	CreatedAt time.Time
	ID        string
	UserID    string
	Option    string
}

// TODO: TO DELETE
type Reaction struct {
	CreatedAt time.Time
	ID        string
	PostID    string
	UserID    string
	Icon      string
}

type SoldTicket struct {
	DeletedAt    time.Time
	CreatedAt    time.Time
	Ticket       *Ticket
	EventRealmID string
	BuyerRealmID string
	UserRealmID  string

	//TODO: TO DELETE
	Checkin *Checkin
	BuyerID string
	UserID  string
}

// TODO: TO DELETE
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

// TODO: DELETE THIS
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

func EventTimezone(location *zenaov1.EventLocation) (*time.Location, error) {
	switch val := location.GetAddress().(type) {
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
	TxWithSpan(ctx context.Context, label string, cb func(db DB) error) error
	WithContext(ctx context.Context) DB

	CreateUser(authID string, realmIDPrefix string) (*User, error)
	GetUserByAuthID(authID string) (*User, error)
	GetUserByRealmID(realmID string) (*User, error)
	GetUsersByRealmIDs(realmIDs []string) ([]*User, error)

	PromoteUser(userID string, plan Plan) error

	Participate(eventRealmID string, buyerRealmID string, userRealmID string, ticketSecret string) error
	CancelParticipation(eventID string, userID string) error
	GetEventUserTicket(eventRealmID string, userRealmID string) (*SoldTicket, error)
	GetEventUserOrBuyerTickets(eventRealmID string, userRealmID string) ([]*SoldTicket, error)
}

type Chain interface {
	WithContext(ctx context.Context) Chain

	// Off-chain operations
	SignerAddress() string
	UserRealmID(userID string) string
	EventRealmID(eventID string) string
	CommunityRealmID(communityID string) string
	EntityRealmID(entityType string, entityID string) (string, error)

	// Read operations (Query)
	EntityRoles(entityRealmID string, orgRealmID string, orgType string) ([]string, error)

	GetUser(userRealmID string) (displayName string, Bio string, ImageUri string, err error)

	// TODO: what happens if event not found ? should i just return empty cmt & empty err or err handle it ?
	GetEvent(eventRealmID string) (*zenaov1.EventInfo, error)
	GetEventUsersByRole(eventRealmID string, role string) ([]string, error)
	GetEventCommunity(eventRealmID string) (*zenaov1.CommunityInfo, error)

	// TODO: what happens if community not found ? should i just return empty cmt & empty err or err handle it ?
	GetCommunity(communityRealmID string) (*zenaov1.CommunityInfo, error)
	GetCommunityUsersByRole(communityRealmID string, role string) ([]string, error)

	// Write operations (Transactions)
	FillAdminProfile()
	CreateUser(user *User) error
	EditUser(userRealmID string, req *zenaov1.EditUserRequest) error

	CreateEvent(eventRealmID string, organizersRealmIDs []string, gatekeepersRealmIDs []string, req *zenaov1.CreateEventRequest, privacy *zenaov1.EventPrivacy) error
	CancelEvent(eventRealmID string, callerRealmID string) error
	EditEvent(eventRealmID string, callerRealmID string, organizersRealmIDs []string, gatekeepersRealmIDs []string, req *zenaov1.EditEventRequest, privacy *zenaov1.EventPrivacy) error
	Participate(eventRealmID string, callerRealmID string, participantRealmID string, ticketPubkey string, eventSK ed25519.PrivateKey) error
	CancelParticipation(eventRealmID string, callerRealmID string, participantRealmID string, ticketPubkey string) error
	Checkin(eventRealmID string, gatekeeperRealmID string, req *zenaov1.CheckinRequest) error

	CreateCommunity(communityRealmID string, administratorsRealmIDs []string, membersRealmIDs []string, eventsRealmIDs []string, req *zenaov1.CreateCommunityRequest) error
	EditCommunity(communityRealmID string, callerRealmID string, administratorsRealmIDs []string, req *zenaov1.EditCommunityRequest) error
	AddEventToCommunity(callerRealmID string, communityRealmID string, eventRealmID string) error
	RemoveEventFromCommunity(callerRealmID string, communityRealmID string, eventRealmID string) error
	AddMemberToCommunity(callerRealmID string, communityRealmID string, userRealmID string) error
	AddMembersToCommunity(callerRealmID string, communityRealmID string, userRealmIDs []string) error
	RemoveMemberFromCommunity(callerRealmID string, communityRealmID string, userRealmID string) error

	CreatePost(userRealmID string, orgRealmID string, post *feedsv1.Post) (postID string, err error)
	DeletePost(userRealmID string, postID string) error
	EditPost(userRealmID string, postID string, post *feedsv1.Post) error
	ReactPost(userRealmID string, req *zenaov1.ReactPostRequest) error
	CreatePoll(userRealmID string, orgRealmID string, req *zenaov1.CreatePollRequest) (pollID, postID string, err error)
	VotePoll(userRealmID string, req *zenaov1.VotePollRequest) error
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
