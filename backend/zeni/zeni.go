package zeni

import (
	"context"
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

	RoleTeamOwner  string = "team_owner"  // for teams
	RoleTeamMember string = "team_member" // for teams (distinct from community "member")
)

const (
	PaymentPlatformStripeConnect = "stripe_connect"

	PaymentOnboardingStateStarted        = "started"
	PaymentOnboardingStateCompleted      = "completed"
	PaymentOnboardingStateMissingAccount = "missing_account"

	PaymentVerificationStatePending        = "pending"
	PaymentVerificationStateVerified       = "verified"
	PaymentVerificationStateFailed         = "failed"
	PaymentVerificationStateMissingAccount = "missing_account"
)

type OrderStatus string

const (
	OrderStatusSuccess OrderStatus = "success"
	OrderStatusPending OrderStatus = "pending"
	OrderStatusFailed  OrderStatus = "failed"
)

type TicketIssueStatus string

const (
	TicketIssueStatusIssued TicketIssueStatus = "issued"
	TicketIssueStatusFailed TicketIssueStatus = "failed"
)

func IsValidEventRole(role string) bool {
	return role == RoleOrganizer || role == RoleGatekeeper || role == RoleParticipant
}

func IsValidUserCommunityRole(role string) bool {
	return role == RoleAdministrator || role == RoleMember
}

func IsValidTeamRole(role string) bool {
	return role == RoleTeamOwner || role == RoleTeamMember
}

const (
	EntityTypeUser      string = "user"
	EntityTypeEvent     string = "event"
	EntityTypeCommunity string = "community"
	EntityTypeTeam      string = "team"
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
	IsTeam      bool
}

type TeamWithRole struct {
	Team *User
	Role string
}

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

type PriceGroup struct {
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt time.Time
	ID        string
	EventID   string
	Capacity  uint32
	Prices    []*Price
}

type Price struct {
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        time.Time
	ID               string
	PriceGroupID     string
	AmountMinor      int64
	CurrencyCode     string
	PaymentAccount   *PaymentAccount
	PaymentAccountID string
}

type Order struct {
	CreatedAt         int64
	ID                string
	EventID           string
	BuyerID           string
	CurrencyCode      string
	AmountMinor       int64
	Status            OrderStatus
	PaymentStatus     string
	PaymentAccountID  string
	PaymentAccount    *PaymentAccount
	PaymentProvider   string
	PaymentSessionID  string
	PaymentIntentID   string
	ConfirmedAt       *int64
	InvoiceID         string
	InvoiceURL        string
	TicketIssueStatus TicketIssueStatus
	TicketIssueError  string
}

type OrderAttendee struct {
	ID           string
	CreatedAt    int64
	OrderID      string
	PriceID      string
	PriceGroupID string
	UserID       string
	AmountMinor  int64
	CurrencyCode string
}

type TicketHold struct {
	CreatedAt    int64
	ID           string
	EventID      string
	PriceGroupID string
	OrderID      string
	Quantity     uint32
	ExpiresAt    int64
}

type EventWithRoles struct {
	Event *Event
	Roles []string
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

type CommunityWithRoles struct {
	Community *Community
	Roles     []string
}

type PaymentAccount struct {
	CreatedAt         time.Time
	UpdatedAt         time.Time
	ID                string
	CommunityID       string
	PlatformType      string
	PlatformAccountID string
	OnboardingState   string
	StartedAt         time.Time
	VerificationState string
	LastVerifiedAt    *time.Time
}

type EntityRole struct {
	CreatedAt  time.Time
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
	PinnedAt  *time.Time
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
	DeletedAt       time.Time
	CreatedAt       time.Time
	Ticket          *Ticket
	EventID         string
	BuyerID         string
	UserID          string
	OrderID         string
	PriceID         string
	PriceGroupID    string
	OrderAttendeeID string
	AmountMinor     int64
	CurrencyCode    string
	User            *User
	Checkin         *Checkin
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
	TxWithSpan(ctx context.Context, label string, cb func(db DB) error) error
	WithContext(ctx context.Context) DB

	CreateUser(authID string) (*User, error)
	GetUser(authID string) (*User, error)
	GetUsersByIDs(ids []string) ([]*User, error)
	// XXX: add EnsureUsersExist

	EditUser(userID string, req *zenaov1.EditUserRequest) error
	PromoteUser(userID string, plan Plan) error
	EntityRoles(entityType string, entityID string, orgType string, orgID string) ([]string, error)
	EntitiesWithRoles(orgType string, orgID string, roles []string) ([]*EntityRole, error)
	CountEntities(orgType string, orgID string, entityType string, role string) (uint32, error)
	GetAllUsers() ([]*User, error)

	CreateEvent(creatorID string, organizersIDs []string, gatekeepersIDs []string, req *zenaov1.CreateEventRequest) (*Event, error)
	CancelEvent(eventID string) error
	EditEvent(eventID string, organizersIDs []string, gatekeepersIDs []string, req *zenaov1.EditEventRequest) (*Event, error)
	ValidatePassword(req *zenaov1.ValidatePasswordRequest) (bool, error)
	GetEvent(eventID string) (*Event, error)
	ListEvents(limit int, offset int, from int64, to int64, discoverable zenaov1.DiscoverableFilter) ([]*Event, error)
	ListEventsByUserRoles(userID string, roles []string, limit int, offset int, from int64, to int64, discoverable zenaov1.DiscoverableFilter) ([]*EventWithRoles, error)
	CountCheckedIn(eventID string) (uint32, error)
	Participate(eventID string, buyerID string, userID string, ticketSecret string, password string, needPassword bool) error
	CancelParticipation(eventID string, userID string) error
	GetAllEvents() ([]*Event, error)
	GetEventTickets(eventID string) ([]*SoldTicket, error)
	CreatePriceGroup(eventID string, capacity uint32) (*PriceGroup, error)
	GetPriceGroupsByEvent(eventID string) ([]*PriceGroup, error)
	UpdatePriceGroupCapacity(priceGroupID string, capacity uint32) error
	CreatePrice(paymentAccount *PaymentAccount, price *Price) (*Price, error)
	UpdatePrice(paymentAccount *PaymentAccount, price *Price) error
	CreateOrder(order *Order, attendees []*OrderAttendee) (*Order, error)
	GetOrder(orderID string) (*Order, error)
	GetOrderAttendees(orderID string) ([]*OrderAttendee, error)
	GetOrderTickets(orderID string) ([]*SoldTicket, error)
	GetOrderPaymentAccount(orderID string) (*PaymentAccount, error)
	UpdateOrderSetPaymentSession(orderID string, provider string, sessionID string) error
	UpdateOrderSetStatus(orderID string, status OrderStatus) error
	UpdateOrderConfirmation(orderID string, status OrderStatus, paymentIntentID string, confirmedAt int64) error
	UpdateOrderConfirmationOnce(orderID string, status OrderStatus, paymentIntentID string, confirmedAt int64) (bool, error)
	UpdateOrderTicketIssue(orderID string, status TicketIssueStatus, errMsg string) error
	CreateTicketHold(hold *TicketHold) (*TicketHold, error)
	DeleteTicketHoldsByOrderID(orderID string) error
	DeleteExpiredTicketHolds(eventID string, nowUnix int64) error
	CountEventSoldTickets(eventID string, priceGroupID string) (uint32, error)
	CountActiveTicketHolds(eventID string, priceGroupID string, nowUnix int64) (uint32, error)
	ListOrderAttendeeTicketIDs(orderID string) ([]string, error)
	CreateSoldTickets(tickets []*SoldTicket) error
	GetEventCommunity(eventID string) (*Community, error)
	GetEventUserTicket(eventID string, userID string) (*SoldTicket, error)
	GetEventUserOrBuyerTickets(eventID string, userID string) ([]*SoldTicket, error)
	Checkin(pubkey string, gatekeeperID string, signature string) (*Event, error)
	RemoveUserGatekeeperRoles(userID string) error

	AddEventToCommunity(eventID string, communityID string) error
	RemoveEventFromCommunity(eventID string, communityID string) error
	// returns all communities that contains the event
	CommunitiesByEvent(eventID string) ([]*Community, error)

	CreateCommunity(creatorID string, administratorsIDs []string, membersIDs []string, eventsIDs []string, req *zenaov1.CreateCommunityRequest) (*Community, error)
	EditCommunity(communityID string, administratorsIDs []string, req *zenaov1.EditCommunityRequest) (*Community, error)
	GetCommunity(communityID string) (*Community, error)
	ListCommunities(entityType string, entityID string, role string, limit int, offset int) ([]*Community, error)
	AddMemberToCommunity(communityID string, userID string) error
	RemoveMemberFromCommunity(communityID string, userID string) error
	GetAllCommunities() ([]*Community, error)
	ListCommunitiesByUserRoles(userID string, roles []string, limit int, offset int) ([]*CommunityWithRoles, error)
	RemoveUserFromAllCommunities(userID string) error

	GetPaymentAccountByCommunityPlatform(communityID string, platformType string) (*PaymentAccount, error)
	UpsertPaymentAccount(account *PaymentAccount) (*PaymentAccount, error)

	CreateTeam(ownerID string, displayName string) (*User, error)
	EditTeam(teamID string, memberIDs []string, req *zenaov1.EditTeamRequest) error
	GetUserByID(userID string) (*User, error)
	GetUserTeams(userID string) ([]*TeamWithRole, error)
	CanDeleteTeam(teamID string) error
	DeleteTeam(teamID string) error

	GetOrgUsersWithRoles(orgType string, orgID string, roles []string) ([]*User, error)
	GetOrgUsers(orgType string, orgID string) ([]*User, error)
	GetOrgByPollID(pollID string) (orgType, orgID string, err error)
	GetOrgByPostID(postID string) (orgType, orgID string, err error)

	CreateFeed(orgType string, orgID string, slug string) (*Feed, error)
	GetFeed(orgType string, orgID string, slug string) (*Feed, error)
	GetFeedByID(feedID string) (*Feed, error)

	CreatePost(feedID string, userID string, post *feedsv1.Post) (*Post, error)
	DeletePost(postID string) error
	EditPost(postID string, req *zenaov1.EditPostRequest) error
	GetPostByID(postID string) (*Post, error)
	GetPostsByFeedID(feedID string, limit int, offset int, tags []string) ([]*Post, error)
	GetPostsByParentID(parentID string, limit int, offset int, tags []string) ([]*Post, error)
	CountChildrenPosts(parentID string) (uint64, error)
	GetAllPosts(getDeleted bool) ([]*Post, error)
	ReactPost(userID string, req *zenaov1.ReactPostRequest) error
	PinPost(feedID string, postID string, pinned bool) error
	DeleteUserPostsByAuthor(userID string) error

	CreatePoll(userID string, feedID string, parentURI string, req *zenaov1.CreatePollRequest) (*Poll, error)
	VotePoll(userID string, req *zenaov1.VotePollRequest) error
	GetPollByID(pollID string, userID string) (*Poll, error)
	GetPollByPostID(postID string, userID string) (*Poll, error)

	// gentxs specific
	GetOrgEntitiesWithRole(orgType string, orgID string, entityType string, role string) ([]*EntityRole, error)
	GetDeletedOrgEntitiesWithRole(orgType string, orgID string, entityType string, role string) ([]*EntityRole, error)
	GetDeletedTickets(eventID string) ([]*SoldTicket, error)
	GetDeletedEvents() ([]*Event, error)
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
