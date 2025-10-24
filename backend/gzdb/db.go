package gzdb

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

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
	RealmID    string `gorm:"uniqueIndex"` // this is the on-chain realm ID
}

type SoldTicket struct {
	gorm.Model

	// TODO: don't make a unique index if we want to allow multiple tickets per user or anonymous tickets
	EventRealmID string         `gorm:"not null;uniqueIndex:idx_event_user_deleted"`
	UserRealmID  string         `gorm:"not null;uniqueIndex:idx_event_user_deleted"`
	DeletedAt    gorm.DeletedAt `gorm:"uniqueIndex:idx_event_user_deleted"`
	BuyerRealmID string         `gorm:"not null"`
	Price        float64
	Secret       string `gorm:"uniqueIndex;not null"`
	Pubkey       string `gorm:"uniqueIndex;not null"`
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
func (g *gormZenaoDB) Participate(eventRealmID string, buyerRealmID string, userRealmID string, ticketSecret string) error {
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

func dbUserToZeniDBUser(dbuser *User) *zeni.User {
	return &zeni.User{
		ID:        fmt.Sprintf("%d", dbuser.ID),
		CreatedAt: dbuser.CreatedAt,
		AuthID:    dbuser.AuthID,
		Plan:      zeni.Plan(dbuser.Plan),
		RealmID:   dbuser.RealmID,
	}
}

func dbSoldTicketToZeniSoldTicket(dbtick *SoldTicket) (*zeni.SoldTicket, error) {
	tickobj, err := zeni.NewTicketFromSecret(dbtick.Secret)
	if err != nil {
		return nil, err
	}
	ticket := &zeni.SoldTicket{
		Ticket:       tickobj,
		CreatedAt:    dbtick.CreatedAt,
		BuyerRealmID: dbtick.BuyerRealmID,
		UserRealmID:  dbtick.UserRealmID,
		EventRealmID: dbtick.EventRealmID,
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
