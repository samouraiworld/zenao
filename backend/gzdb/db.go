package gzdb

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/plugin/opentelemetry/tracing"
)

const userDefaultAvatar = "ipfs://bafybeidrbpiyfvwsel6fxb7wl4p64tymnhgd7xnt3nowquqymtllrq67uy"

type User struct {
	gorm.Model          // this ID should be used for any database related logic (like querying)
	AuthID      *string `gorm:"uniqueIndex"` // this ID should be only used for user identification & creation (auth provider id: clerk, auth0, etc). nil for teams.
	DisplayName string
	Bio         string
	AvatarURI   string
	Plan        string `gorm:"default:'free'"`
	IsTeam      bool   `gorm:"default:false"` // true for team accounts (teams are stored as users)
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
	EventID         uint `gorm:"index"`
	BuyerID         uint
	UserID          uint
	OrderID         *string `gorm:"index"`
	PriceID         *uint   `gorm:"index"`
	PriceGroupID    *uint   `gorm:"index"`
	OrderAttendeeID *string `gorm:"index"`
	User            *User
	AmountMinor     *int64
	CurrencyCode    string
	Secret          string `gorm:"uniqueIndex;not null"`
	Pubkey          string `gorm:"uniqueIndex;not null"`
	Checkin         *Checkin
}

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
		// _busy_timeout: retry for 5s instead of failing immediately on SQLITE_BUSY
		// _journal_mode=WAL: allows concurrent reads during writes
		sep := "?"
		if strings.Contains(dsn, "?") {
			sep = "&"
		}
		db, err = gorm.Open(sqlite.Open(dsn+sep+"_busy_timeout=5000&_journal_mode=WAL"), &gorm.Config{})
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

// ValidatePassword implements zeni.DB.
func (g *gormZenaoDB) ValidatePassword(req *zenaov1.ValidatePasswordRequest) (bool, error) {
	evt, err := g.getDBEvent(req.EventId)
	if err != nil {
		return false, err
	}

	return validatePassword(req.Password, evt.PasswordHash)
}

func (g *gormZenaoDB) trace(label string) (*gormZenaoDB, trace.Span) {
	ctx, span := otel.Tracer("gzdb").Start(
		g.db.Statement.Context,
		label,
		trace.WithSpanKind(trace.SpanKindClient),
	)
	return g.withContext(ctx), span
}

// --- Converters ---

func dbUserToZeniDBUser(dbuser *User) *zeni.User {
	authID := ""
	if dbuser.AuthID != nil {
		authID = *dbuser.AuthID
	}
	u := &zeni.User{
		ID:          fmt.Sprintf("%d", dbuser.ID),
		CreatedAt:   dbuser.CreatedAt,
		DisplayName: dbuser.DisplayName,
		Bio:         dbuser.Bio,
		AvatarURI:   dbuser.AvatarURI,
		AuthID:      authID,
		Plan:        zeni.Plan(dbuser.Plan),
		IsTeam:      dbuser.IsTeam,
	}
	if u.DisplayName == "" {
		u.DisplayName = fmt.Sprintf("Zenao user #%d", dbuser.ID)
	}
	if u.Bio == "" {
		u.Bio = "Zenao Managed User"
	}
	if u.AvatarURI == "" {
		u.AvatarURI = userDefaultAvatar
	}
	return u
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
	var checkin *zeni.Checkin
	if dbtick.Checkin != nil {
		checkin = &zeni.Checkin{
			At:           dbtick.Checkin.CreatedAt,
			GatekeeperID: fmt.Sprint(dbtick.Checkin.GatekeeperID),
			Signature:    dbtick.Checkin.Signature,
		}
	}
	var user *zeni.User
	if dbtick.User != nil {
		user = dbUserToZeniDBUser(dbtick.User)
	}

	amountMinor := int64(0)
	if dbtick.AmountMinor != nil {
		amountMinor = *dbtick.AmountMinor
	}

	ticket := &zeni.SoldTicket{
		Ticket:          tickobj,
		EventID:         fmt.Sprint(dbtick.EventID),
		BuyerID:         fmt.Sprint(dbtick.BuyerID),
		UserID:          fmt.Sprint(dbtick.UserID),
		OrderID:         stringPtrToString(dbtick.OrderID),
		PriceID:         uintPtrToString(dbtick.PriceID),
		PriceGroupID:    uintPtrToString(dbtick.PriceGroupID),
		OrderAttendeeID: stringPtrToString(dbtick.OrderAttendeeID),
		AmountMinor:     amountMinor,
		CurrencyCode:    dbtick.CurrencyCode,
		Checkin:         checkin,
		User:            user,
		CreatedAt:       dbtick.CreatedAt,
	}
	if dbtick.DeletedAt.Valid {
		ticket.DeletedAt = dbtick.DeletedAt.Time
	}
	return ticket, nil
}

// updateUserRoles updates the users having the given role in the given org (orgType and orgID).
// It adds the role to the users in userIDs that do not have it yet, and removes the role from the users that are not in userIDs.
func (g *gormZenaoDB) updateUserRoles(role string, userIDs []string, orgID string, orgType string) error {
	orgIDInt, err := strconv.ParseUint(orgID, 10, 64)
	if err != nil {
		return err
	}

	var currentUsersIDs []string
	currentUsers, err := g.GetOrgUsersWithRoles(orgType, orgID, []string{role})
	if err != nil {
		return fmt.Errorf("get users with role %s: %w", role, err)
	}
	for _, usr := range currentUsers {
		currentUsersIDs = append(currentUsersIDs, usr.ID)
	}

	usersToRemove := make([]string, 0, len(currentUsers))
	for _, userID := range currentUsersIDs {
		if !slices.Contains(userIDs, userID) {
			usersToRemove = append(usersToRemove, userID)
		}
	}
	if len(usersToRemove) > 0 {
		if err := g.db.
			Where("org_type = ? AND org_id = ? AND role = ? AND entity_type = ? AND entity_id IN ?",
				orgType, orgID, role, zeni.EntityTypeUser, usersToRemove).
			Delete(&EntityRole{}).Error; err != nil {
			return fmt.Errorf("delete existing %s roles before adding the new ones: %w", role, err)
		}
	}

	usersToAdd := make([]string, 0, len(userIDs))
	for _, userID := range userIDs {
		if !slices.Contains(currentUsersIDs, userID) {
			usersToAdd = append(usersToAdd, userID)
		}
	}

	for _, userID := range usersToAdd {
		userIDInt, err := strconv.ParseUint(userID, 10, 64)
		if err != nil {
			return fmt.Errorf("parse %s id: %w", role, err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(userIDInt),
			OrgType:    orgType,
			OrgID:      uint(orgIDInt),
			Role:       role,
		}

		if err := g.db.Save(entityRole).Error; err != nil {
			return fmt.Errorf("create %s role assignment in db: %w", role, err)
		}
	}
	return nil
}
