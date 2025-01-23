package main

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Event struct {
	gorm.Model
	Title       string
	Description string
	StartDate   time.Time
	EndDate     time.Time
	ImageURI    string
	TicketPrice float64
	Capacity    uint32
	Location    string
	CreatorID   uint
	Creator     User `gorm:"foreignKey:CreatorID"`
}

type SoldTicket struct {
	gorm.Model
	EventID uint
	UserID  string
	Price   float64
}

type User struct {
	gorm.Model         // this ID should be used for any database related logic (like querying)
	ClerkID     string `gorm:"uniqueIndex"` // this ID should be only use for user identification & creation
	DisplayName string
	Bio         string
	AvatarURI   string
}

func setupLocalDB(path string) (*gormZenaoDB, error) {
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Migrate the schema
	if err := db.AutoMigrate(&Event{}, &SoldTicket{}, &User{}); err != nil {
		return nil, err
	}

	return &gormZenaoDB{db: db}, nil
}

type gormZenaoDB struct {
	db *gorm.DB
}

func (g *gormZenaoDB) Tx(cb func(db ZenaoDB) error) error {
	return g.db.Transaction(func(tx *gorm.DB) error {
		return cb(&gormZenaoDB{db: tx})
	})
}

// CreateEvent implements ZenaoDB.
func (g *gormZenaoDB) CreateEvent(creatorID string, req *zenaov1.CreateEventRequest) (string, error) {
	// XXX: validate?
	creatorIDInt, err := strconv.ParseUint(creatorID, 10, 64)
	if err != nil {
		return "", err
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
		Location:    req.Location,
	}
	if err := g.db.Create(evt).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("%d", evt.ID), nil
}

// EditEvent implements ZenaoDB.
func (g *gormZenaoDB) EditEvent(eventID string, req *zenaov1.EditEventRequest) error {
	// XXX: validate?
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return err
	}

	if err := g.db.Model(&Event{}).Where("id = ?", evtIDInt).Updates(Event{
		Title:       req.Title,
		Description: req.Description,
		ImageURI:    req.ImageUri,
		StartDate:   time.Unix(int64(req.StartDate), 0), // XXX: overflow?
		EndDate:     time.Unix(int64(req.EndDate), 0),   // XXX: overflow?
		TicketPrice: req.TicketPrice,
		Capacity:    req.Capacity,
		Location:    req.Location,
	}).Error; err != nil {
		return err
	}
	return nil
}

// GetEvent implements ZenaoDB.
func (g *gormZenaoDB) GetEvent(id string) (*Event, error) {
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

// CreateUser implements ZenaoDB.
func (g *gormZenaoDB) CreateUser(clerkID string) (string, error) {
	user := &User{
		ClerkID: clerkID,
	}
	if err := g.db.Create(user).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("%d", user.ID), nil
}

// Participate implements ZenaoDB.
func (g *gormZenaoDB) Participate(eventID string, userID string) error {
	evt, err := g.GetEvent(eventID)
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

	return nil
}

// EditUser implements ZenaoDB.
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

// UserExists implements ZenaoDB.
func (g *gormZenaoDB) UserExists(clerkID string) (string, error) {
	var user User
	if err := g.db.Where("clerk_id = ?", clerkID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return fmt.Sprintf("%d", user.ID), nil
}
