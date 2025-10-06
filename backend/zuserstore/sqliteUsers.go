package zusers

import (
	"context"
	"errors"
	"fmt"
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
	gorm.Model
	AuthID string `gorm:"uniqueIndex"` // this ID should be only used for user identification & creation (auth provider id: clerk, auth0, etc)
	Plan   string `gorm:"not null;default:free"`
}

type sqliteUsers struct {
	db *gorm.DB
}

var ErrUserNotFound = errors.New("user not found")

func dbUserToZeniUser(dbuser *User) *zeni.User {
	return &zeni.User{
		ID:        fmt.Sprintf("%d", dbuser.ID),
		CreatedAt: dbuser.CreatedAt,
		AuthID:    dbuser.AuthID,
		Plan:      zeni.Plan(dbuser.Plan),
	}
}

func SetupSqliteUsers(dsn string) (zeni.UserStore, error) {
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

	return &sqliteUsers{db: db}, nil
}

// CreateUser implements zeni.UserStore interface.
func (s *sqliteUsers) CreateUser(authID string) (*zeni.User, error) {
	s, span := s.trace("sqliteUsers.CreateUser")
	defer span.End()

	user := &User{
		AuthID: authID,
	}
	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}
	return dbUserToZeniUser(user), nil
}

// GetUser implements zeni.UserStore interface.
func (s *sqliteUsers) GetUser(authID string) (*zeni.User, error) {
	s, span := s.trace("sqliteUsers.GetUser")
	defer span.End()

	var user User
	if err := s.db.Where("auth_id = ?", authID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return dbUserToZeniUser(&user), nil
}

// PromoteUser implements zeni.UserStore interface.
func (s *sqliteUsers) PromoteUser(authID string, plan zeni.Plan) error {
	if !plan.IsValid() {
		return fmt.Errorf("invalid plan: %s", plan)
	}

	return s.db.Model(&User{}).Where("auth_id = ?", authID).Update("plan", string(plan)).Error
}

// RemoveUser implements zeni.UserStore interface.
func (s *sqliteUsers) RemoveUser(authID string) error {
	res := s.db.Where("auth_id = ?", authID).Delete(&User{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrUserNotFound
	}
	return nil
}

// WithContext implements zeni.UserStore
func (s *sqliteUsers) WithContext(ctx context.Context) zeni.UserStore {
	return s.withContext(ctx)
}

// Tx implements zeni.UserStore
func (s *sqliteUsers) Tx(cb func(db zeni.UserStore) error) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		return cb(&sqliteUsers{db: tx})
	})
}

// TxWithSpan implements zeni.UserStore.
func (s *sqliteUsers) TxWithSpan(ctx context.Context, label string, cb func(db zeni.UserStore) error) error {
	spanCtx, span := otel.Tracer("gzdb").Start(
		ctx,
		label,
		trace.WithSpanKind(trace.SpanKindClient),
	)
	defer span.End()
	return cb(s.withContext(spanCtx))
}

func (s *sqliteUsers) withContext(ctx context.Context) *sqliteUsers {
	return &sqliteUsers{db: s.db.WithContext(ctx)}
}

func (g *sqliteUsers) trace(label string) (*sqliteUsers, trace.Span) {
	ctx, span := otel.Tracer("gzdb").Start(
		g.db.Statement.Context,
		label,
		trace.WithSpanKind(trace.SpanKindClient),
	)
	return g.withContext(ctx), span
}
