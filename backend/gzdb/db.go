package gzdb

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/plugin/opentelemetry/tracing"
)

type User struct {
	gorm.Model        // this ID should be used for any database related logic (like querying)
	AuthID     string `gorm:"uniqueIndex"` // this ID should be only used for user identification & creation (auth provider id: clerk, auth0, etc)
	Plan       string `gorm:"default:'free'"`
	RealmID    string `gorm:"uniqueIndex"`

	//TODO: DELETE ALL FIELDS BELOW
	DisplayName string
	Bio         string
	AvatarURI   string
}

type EntityRole struct {
	CreatedAt time.Time `gorm:"<-:create"`
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	EntityType string `gorm:"primaryKey"` // e.g. "user", "event"
	EntityID   uint   `gorm:"primaryKey;autoIncrement:false"`

	OrgType string `gorm:"primaryKey"` // e.g. "event", "community"
	OrgID   uint   `gorm:"primaryKey;autoIncrement:false"`

	Role string `gorm:"primaryKey"`
}

type SoldTicket struct {
	gorm.Model

	// TODO: don't make a unique index if we want to allow multiple tickets per user or anonymous tickets
	EventRealmID string         `gorm:"not null;uniqueIndex:idx_event_user_deleted"`
	UserRealmID  string         `gorm:"not null;uniqueIndex:idx_event_user_deleted"`
	DeletedAt    gorm.DeletedAt `gorm:"uniqueIndex:idx_event_user_deleted"`

	BuyerRealmID string `gorm:"not null"`

	Price  float64
	Secret string `gorm:"uniqueIndex;not null"`
	Pubkey string `gorm:"uniqueIndex;not null"`

	//TODO: DELETE ALL FIELDS BELOW
	EventID uint `gorm:"index"`
	UserID  uint
	User    *User
	Checkin *Checkin
	BuyerID uint
}

// TODO: DELETE ALL FIELDS BELOW
type Checkin struct {
	// gorm.Model without ID
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	SoldTicketID uint `gorm:"primaryKey;not null"`
	GatekeeperID uint
	Signature    string
}

func SetupDB(dsn string) (zeni.DB, error) {
	var (
		db  *gorm.DB
		err error
	)

	if strings.HasPrefix(dsn, "libsql") {
		db, err = gorm.Open(sqlite.New(sqlite.Config{
			DriverName: "libsql",
			DSN:        dsn,
		}), &gorm.Config{})
	} else {
		db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	}
	if err != nil {
		return nil, err
	}

	if err := db.Use(tracing.NewPlugin()); err != nil {
		return nil, err
	}

	return &gormZenaoDB{db: db}, nil
}

type gormZenaoDB struct {
	db *gorm.DB
}

// TxWithSpan implements zeni.DB.
func (g *gormZenaoDB) TxWithSpan(ctx context.Context, label string, cb func(db zeni.DB) error) error {
	spanCtx, span := otel.Tracer("gzdb").Start(
		ctx,
		label,
		trace.WithSpanKind(trace.SpanKindClient),
	)
	defer span.End()
	return cb(g.withContext(spanCtx))
}

// WithContext implements zeni.DB.
func (g *gormZenaoDB) WithContext(ctx context.Context) zeni.DB {
	return g.withContext(ctx)
}

func (g *gormZenaoDB) withContext(ctx context.Context) *gormZenaoDB {
	return &gormZenaoDB{db: g.db.WithContext(ctx)}
}

func (g *gormZenaoDB) Tx(cb func(db zeni.DB) error) error {
	return g.db.Transaction(func(tx *gorm.DB) error {
		return cb(&gormZenaoDB{db: tx})
	})
}

// CreateUser implements zeni.DB.
func (g *gormZenaoDB) CreateUser(authID string, realmIDPrefix string) (*zeni.User, error) {
	user := &User{
		AuthID: authID,
	}
	if err := g.db.Create(user).Error; err != nil {
		return nil, err
	}

	user.RealmID = fmt.Sprintf("%s%d", realmIDPrefix, user.ID)
	if err := g.db.Model(user).Update("realm_id", user.RealmID).Error; err != nil {
		return nil, err
	}

	return dbUserToZeniDBUser(user), nil
}

// Participate implements zeni.DB.
func (g *gormZenaoDB) Participate(buyerID string, userID string, eventRealmID string, buyerRealmID string, userRealmID string, ticketSecret string) error {
	buyerIDInt, err := strconv.ParseUint(buyerID, 10, 64)
	if err != nil {
		return err
	}
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return err
	}
	g, span := g.trace("gzdb.Participate")
	defer span.End()

	ticket, err := zeni.NewTicketFromSecret(ticketSecret)
	if err != nil {
		return err
	}

	if err := g.db.Save(&SoldTicket{
		EventRealmID: eventRealmID,
		UserRealmID:  userRealmID,
		BuyerRealmID: buyerRealmID,
		Secret:       ticket.Secret(),
		Pubkey:       ticket.Pubkey(),
		UserID:       uint(userIDInt),
		BuyerID:      uint(buyerIDInt),
	}).Error; err != nil {
		return err
	}

	return nil
}

// CancelParticipation implements zeni.DB.
func (g *gormZenaoDB) CancelParticipation(eventRealmID string, userRealmID string) error {
	g, span := g.trace("gzdb.CancelParticipation")
	defer span.End()

	if err := g.db.Model(&SoldTicket{}).Where("event_realm_id = ? AND user_realm_id = ?", eventRealmID, userRealmID).Delete(&SoldTicket{}).Error; err != nil {
		return err
	}
	return nil
}

// PromoteUser implements zeni.DB.
func (g *gormZenaoDB) PromoteUser(userID string, plan zeni.Plan) error {
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return err
	}

	if !plan.IsValid() {
		return fmt.Errorf("invalid plan: %s", plan)
	}

	return g.db.Model(&User{}).Where("id = ?", userIDInt).Update("plan", string(plan)).Error
}

// GetUserFromAuthID implements zeni.DB.
func (g *gormZenaoDB) GetUserByAuthID(authID string) (*zeni.User, error) {
	var user User
	if err := g.db.Where("auth_id = ?", authID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return dbUserToZeniDBUser(&user), nil
}

// GetUserByRealmID implements zeni.DB.
func (g *gormZenaoDB) GetUserByRealmID(userRealmID string) (*zeni.User, error) {
	var user User
	if err := g.db.Where("realm_id = ?", userRealmID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return dbUserToZeniDBUser(&user), nil
}

// GetUsersByRealmIDs implements zeni.DB.
func (g *gormZenaoDB) GetUsersByRealmIDs(userRealmIDs []string) ([]*zeni.User, error) {
	if len(userRealmIDs) == 0 {
		return []*zeni.User{}, nil
	}

	var users []User
	if err := g.db.Where("realm_id IN ?", userRealmIDs).Find(&users).Error; err != nil {
		return nil, err
	}

	result := make([]*zeni.User, 0, len(users))
	for _, u := range users {
		result = append(result, dbUserToZeniDBUser(&u))
	}
	return result, nil
}

// GetAllUsers implements zeni.DB.
func (g *gormZenaoDB) GetAllUsers() ([]*zeni.User, error) {
	var users []*User
	if err := g.db.Find(&users).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.User, 0, len(users))
	for _, u := range users {
		res = append(res, dbUserToZeniDBUser(u))
	}
	return res, nil
}

// GetAllEvents implements zeni.DB.
func (g *gormZenaoDB) GetAllEvents() ([]*zeni.Event, error) {
	var events []*Event
	if err := g.db.Find(&events).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.Event, 0, len(events))
	for _, e := range events {
		zevt, err := dbEventToZeniEvent(e)
		if err != nil {
			return nil, err
		}
		res = append(res, zevt)
	}
	return res, nil
}

// GetOrgEntitiesWithRole implements zeni.DB.
func (g *gormZenaoDB) GetOrgEntitiesWithRole(orgType string, orgID string, entityType string, role string) ([]*zeni.EntityRole, error) {
	var roles []EntityRole
	if err := g.db.
		Where("org_type = ? AND org_id = ? AND role = ? AND entity_type = ?",
			orgType, orgID, role, entityType).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	result := make([]*zeni.EntityRole, 0, len(roles))
	for _, r := range roles {
		result = append(result, dbEntityRoleToZeniEntityRole(&r))
	}
	return result, nil
}

// GetDeletedOrgEntitiesWithRole implements zeni.DB.
func (g *gormZenaoDB) GetDeletedOrgEntitiesWithRole(orgType string, orgID string, entityType string, role string) ([]*zeni.EntityRole, error) {
	var roles []EntityRole
	if err := g.db.
		Unscoped().
		Where("org_type = ? AND org_id = ? AND role = ? AND entity_type = ? AND deleted_at IS NOT NULL",
			orgType, orgID, role, entityType).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	result := make([]*zeni.EntityRole, 0, len(roles))
	for _, r := range roles {
		result = append(result, dbEntityRoleToZeniEntityRole(&r))
	}
	return result, nil
}

// GetDeletedTickets implements zeni.DB.
func (g *gormZenaoDB) GetDeletedTickets(eventID string) ([]*zeni.SoldTicket, error) {
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}
	var tickets []SoldTicket
	if err := g.db.Unscoped().Where("event_id = ? AND deleted_at IS NOT NULL", evtIDInt).Find(&tickets).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.SoldTicket, len(tickets))
	for i, ticket := range tickets {
		res[i], err = dbSoldTicketToZeniSoldTicket(&ticket)
		if err != nil {
			return nil, err
		}
	}
	return res, nil
}

// GetDeletedEvents implements zeni.DB.
func (g *gormZenaoDB) GetDeletedEvents() ([]*zeni.Event, error) {
	var events []Event
	if err := g.db.Unscoped().Where("deleted_at IS NOT NULL").Find(&events).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.Event, 0, len(events))
	for _, e := range events {
		zevt, err := dbEventToZeniEvent(&e)
		if err != nil {
			return nil, fmt.Errorf("convert db event to zeni event: %w", err)
		}
		res = append(res, zevt)
	}
	return res, nil
}

// GetEventTickets implements zeni.DB.
func (g *gormZenaoDB) GetEventTickets(eventID string) ([]*zeni.SoldTicket, error) {
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}

	tickets := []*SoldTicket{}
	if err := g.db.Preload("Checkin").Preload("User").Find(&tickets, "event_id = ?", evtIDInt).Error; err != nil {
		return nil, err
	}

	res := make([]*zeni.SoldTicket, len(tickets))
	for i, ticket := range tickets {
		res[i], err = dbSoldTicketToZeniSoldTicket(ticket)
		if err != nil {
			return nil, err
		}
	}

	return res, nil
}

// GetEventUserTicket implements zeni.DB.
func (g *gormZenaoDB) GetEventUserTicket(eventRealmID string, userRealmID string) (*zeni.SoldTicket, error) {
	var ticket *SoldTicket
	err := g.db.Model(&SoldTicket{}).Where("event_realm_id = ? AND user_realm_id = ?", eventRealmID, userRealmID).First(&ticket).Error
	if err != nil {
		return nil, err
	}
	res, err := dbSoldTicketToZeniSoldTicket(ticket)
	if err != nil {
		return nil, err
	}
	return res, nil
}

// GetEventUserOrBuyerTickets implements zeni.DB.
func (g *gormZenaoDB) GetEventUserOrBuyerTickets(eventRealmID string, userRealmID string) ([]*zeni.SoldTicket, error) {
	tickets := []*SoldTicket{}
	err := g.db.Model(&SoldTicket{}).Find(&tickets, "event_realm_id = ? AND (buyer_realm_id = ? OR user_realm_id = ?)", eventRealmID, userRealmID, userRealmID).Error
	if err != nil {
		return nil, err
	}

	res := make([]*zeni.SoldTicket, len(tickets))
	for i, ticket := range tickets {
		res[i], err = dbSoldTicketToZeniSoldTicket(ticket)
		if err != nil {
			return nil, err
		}
	}

	return res, nil
}

func (g *gormZenaoDB) EntityRoles(entityType string, entityID string, orgType string, orgID string) ([]string, error) {
	var roles []EntityRole

	if err := g.db.
		Where("entity_type = ? AND entity_id = ? AND org_type = ? AND org_id = ?",
			entityType, entityID, orgType, orgID).
		Find(&roles).Error; err != nil {
		return nil, err
	}

	res := make([]string, 0, len(roles))
	for _, role := range roles {
		res = append(res, role.Role)
	}

	return res, nil
}

// GetAllCommunities implements zeni.DB.
func (g *gormZenaoDB) GetAllCommunities() ([]*zeni.Community, error) {
	var communities []*Community
	if err := g.db.Find(&communities).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.Community, 0, len(communities))
	for _, c := range communities {
		zcmt, err := dbCommunityToZeniCommunity(c)
		if err != nil {
			return nil, err
		}
		res = append(res, zcmt)
	}
	return res, nil
}

// GetFeedByID implements zeni.DB.
func (g *gormZenaoDB) GetFeedByID(feedID string) (*zeni.Feed, error) {
	var feed Feed
	if err := g.db.Where("id = ?", feedID).First(&feed).Error; err != nil {
		return nil, err
	}

	zfeed, err := dbFeedToZeniFeed(&feed)
	if err != nil {
		return nil, err
	}
	return zfeed, nil
}

// GetAllPosts implements zeni.DB.
func (g *gormZenaoDB) GetAllPosts(getDeleted bool) ([]*zeni.Post, error) {
	db := g.db
	if getDeleted {
		db = db.Unscoped()
	}

	var posts []*Post
	if err := db.Preload("Reactions").Preload("Tags").Find(&posts).Error; err != nil {
		return nil, err
	}

	res := make([]*zeni.Post, 0, len(posts))
	for _, p := range posts {
		zpost, err := dbPostToZeniPost(p)
		if err != nil {
			return nil, err
		}
		res = append(res, zpost)
	}

	return res, nil
}

func (g *gormZenaoDB) GetPollByPostID(postID string) (*zeni.Poll, error) {
	postIDint, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return nil, err
	}

	var poll Poll
	if err := g.db.Where("post_id = ?", postIDint).Preload("Results").Preload("Results.Votes").First(&poll).Error; err != nil {
		return nil, err
	}

	return dbPollToZeniPoll(&poll)
}

func dbUserToZeniDBUser(dbuser *User) *zeni.User {
	return &zeni.User{
		ID:        fmt.Sprintf("%d", dbuser.ID),
		CreatedAt: dbuser.CreatedAt,
		AuthID:    dbuser.AuthID,
		Plan:      zeni.Plan(dbuser.Plan),
		RealmID:   dbuser.RealmID,
	}
}

func dbEntityRoleToZeniEntityRole(dbrole *EntityRole) *zeni.EntityRole {
	er := &zeni.EntityRole{
		CreatedAt:  dbrole.CreatedAt,
		EntityType: dbrole.EntityType,
		EntityID:   fmt.Sprintf("%d", dbrole.EntityID),
		OrgType:    dbrole.OrgType,
		OrgID:      fmt.Sprintf("%d", dbrole.OrgID),
		Role:       dbrole.Role,
	}
	if dbrole.DeletedAt.Valid {
		er.DeletedAt = dbrole.DeletedAt.Time
	}
	return er
}

func dbSoldTicketToZeniSoldTicket(dbtick *SoldTicket) (*zeni.SoldTicket, error) {
	tickobj, err := zeni.NewTicketFromSecret(dbtick.Secret)
	if err != nil {
		return nil, err
	}
	ticket := &zeni.SoldTicket{
		Ticket: tickobj,

		BuyerRealmID: dbtick.BuyerRealmID,
		UserRealmID:  dbtick.UserRealmID,
		EventRealmID: dbtick.EventRealmID,

		//TODO: DELETE ALL FIELDS BELOW
		BuyerID:   fmt.Sprint(dbtick.BuyerID),
		UserID:    fmt.Sprint(dbtick.UserID),
		CreatedAt: dbtick.CreatedAt,
	}
	if dbtick.DeletedAt.Valid {
		ticket.DeletedAt = dbtick.DeletedAt.Time
	}
	return ticket, nil
}

func (g *gormZenaoDB) trace(label string) (*gormZenaoDB, trace.Span) {
	ctx, span := otel.Tracer("gzdb").Start(
		g.db.Statement.Context,
		label,
		trace.WithSpanKind(trace.SpanKindClient),
	)
	return g.withContext(ctx), span
}
