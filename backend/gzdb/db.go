package gzdb

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model         // this ID should be used for any database related logic (like querying)
	ClerkID     string `gorm:"uniqueIndex"` // this ID should be only used for user identification & creation
	DisplayName string
	Bio         string
	AvatarURI   string
}

type UserRole struct {
	// gorm.Model without ID
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	UserID  uint   `gorm:"primaryKey;autoIncrement:false"`
	EventID uint   `gorm:"primaryKey;autoIncrement:false"`
	Role    string `gorm:"primaryKey"`
}

type SoldTicket struct {
	gorm.Model
	EventID uint
	UserID  string // XXX: should be uint
	Price   float64
	Secret  string
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

	return &gormZenaoDB{db: db}, nil
}

type gormZenaoDB struct {
	db *gorm.DB
}

func (g *gormZenaoDB) Tx(cb func(db zeni.DB) error) error {
	return g.db.Transaction(func(tx *gorm.DB) error {
		return cb(&gormZenaoDB{db: tx})
	})
}

// CreateEvent implements zeni.DB.
func (g *gormZenaoDB) CreateEvent(creatorID string, req *zenaov1.CreateEventRequest) (*zeni.Event, error) {
	// NOTE: request should be validated by caller

	creatorIDInt, err := strconv.ParseUint(creatorID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse creator id: %w", err)
	}

	evt := &Event{
		Title:       req.Title,
		Description: req.Description,
		ImageURI:    req.ImageUri,
		StartDate:   time.Unix(int64(req.StartDate), 0), // XXX: overflow?
		EndDate:     time.Unix(int64(req.EndDate), 0),   // XXX: overflow?
		CreatorID:   uint(creatorIDInt),
		TicketPrice: req.TicketPrice,
		Capacity:    req.Capacity,
	}
	if err := evt.SetLocation(req.Location); err != nil {
		return nil, fmt.Errorf("convert location: %w", err)
	}

	if err := g.db.Create(evt).Error; err != nil {
		return nil, fmt.Errorf("create event in db: %w", err)
	}

	userRole := &UserRole{
		UserID:  uint(creatorIDInt),
		EventID: evt.ID,
		Role:    "organizer",
	}

	if err := g.db.Create(userRole).Error; err != nil {
		return nil, fmt.Errorf("create organizer role assignment in db: %w", err)
	}

	zevt, err := dbEventToZeniEvent(evt)
	if err != nil {
		return nil, fmt.Errorf("convert db event to zeni event: %w", err)
	}

	return zevt, nil
}

// EditEvent implements zeni.DB.
func (g *gormZenaoDB) EditEvent(eventID string, req *zenaov1.EditEventRequest) error {
	// XXX: validate?
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return err
	}

	evt := Event{
		Title:       req.Title,
		Description: req.Description,
		ImageURI:    req.ImageUri,
		StartDate:   time.Unix(int64(req.StartDate), 0), // XXX: overflow?
		EndDate:     time.Unix(int64(req.EndDate), 0),   // XXX: overflow?
		TicketPrice: req.TicketPrice,
		Capacity:    req.Capacity,
	}
	if err := evt.SetLocation(req.Location); err != nil {
		return err
	}

	if err := g.db.Model(&Event{}).Where("id = ?", evtIDInt).Updates(evt).Error; err != nil {
		return err
	}
	return nil
}

// GetEvent implements zeni.DB.
func (g *gormZenaoDB) GetEvent(id string) (*zeni.Event, error) {
	evt, err := g.getDBEvent(id)
	if err != nil {
		return nil, err
	}
	return dbEventToZeniEvent(evt)
}

// GetEvent implements zeni.DB.
func (g *gormZenaoDB) getDBEvent(id string) (*Event, error) {
	evtIDInt, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		return nil, err
	}
	var evt Event
	evt.ID = uint(evtIDInt)
	if err := g.db.First(&evt).Error; err != nil {
		return nil, err
	}
	return &evt, nil
}

// CreateUser implements zeni.DB.
func (g *gormZenaoDB) CreateUser(authID string) (string, error) {
	user := &User{
		ClerkID: authID,
	}
	if err := g.db.Create(user).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("%d", user.ID), nil
}

// Participate implements zeni.DB.
func (g *gormZenaoDB) Participate(eventID string, userID string) error {
	evt, err := g.getDBEvent(eventID)
	if err != nil {
		return err
	}

	var participantsCount int64
	if err := g.db.Model(&SoldTicket{}).Where("event_id = ?", evt.ID).Count(&participantsCount).Error; err != nil {
		return err
	}

	remaining := int64(evt.Capacity) - participantsCount
	if remaining <= 0 {
		return errors.New("sold out")
	}

	var count int64
	if err := g.db.Model(&SoldTicket{}).Where("event_id = ? AND user_id = ?", evt.ID, userID).Count(&count).Error; err != nil {
		return err
	}
	if count != 0 {
		return errors.New("user is already participant for this event")
	}

	if err := g.db.Create(&SoldTicket{EventID: evt.ID, UserID: userID}).Error; err != nil {
		return err
	}

	if err := g.db.Model(&UserRole{}).Where("event_id = ? AND user_id = ? and role = ?", evt.ID, userID, "participant").Count(&count).Error; err != nil {
		return err
	}
	if count != 0 {
		return errors.New("user is already participant for this event")
	}

	userIDint, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return err
	}
	participant := &UserRole{
		UserID:  uint(userIDint),
		EventID: evt.ID,
		Role:    "participant",
	}

	if err := g.db.Create(participant).Error; err != nil {
		return err
	}

	return nil
}

// EditUser implements zeni.DB.
func (g *gormZenaoDB) EditUser(userID string, req *zenaov1.EditUserRequest) error {
	// XXX: validate?
	if err := g.db.Model(&User{}).Where("id = ?", userID).Updates(User{
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		AvatarURI:   req.AvatarUri,
	}).Error; err != nil {
		return err
	}
	return nil
}

// UserExists implements zeni.DB.
func (g *gormZenaoDB) UserExists(authID string) (string, error) {
	var user User
	if err := g.db.Where("clerk_id = ?", authID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return fmt.Sprintf("%d", user.ID), nil
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

// GetAllParticipants implements zeni.DB.
func (g *gormZenaoDB) GetAllParticipants(eventID string) ([]*zeni.User, error) {
	var tickets []*SoldTicket
	if err := g.db.Find(&tickets, "event_id = ?", eventID).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.User, 0, len(tickets))
	for _, e := range tickets {
		res = append(res, &zeni.User{ID: e.UserID})
	}
	return res, nil
}

// UserRoles implements zeni.DB.
func (g *gormZenaoDB) UserRoles(userID string, eventID string) ([]string, error) {
	var roles []UserRole
	if err := g.db.Find(&roles, "user_id = ? AND event_id = ?", userID, eventID).Error; err != nil {
		return nil, err
	}
	res := make([]string, 0, len(roles))
	for _, role := range roles {
		res = append(res, role.Role)
	}
	return res, nil
}

func dbUserToZeniDBUser(dbuser *User) *zeni.User {
	return &zeni.User{
		ID:          fmt.Sprintf("%d", dbuser.ID),
		DisplayName: dbuser.DisplayName,
		Bio:         dbuser.Bio,
		AvatarURI:   dbuser.AvatarURI,
	}
}
