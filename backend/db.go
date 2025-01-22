package main

import (
	"errors"
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
func (g *gormZenaoDB) CreateEvent(creatorID uint, req *zenaov1.CreateEventRequest) (uint, error) {
	// XXX: validate?
	evt := &Event{
		Title:       req.Title,
		Description: req.Description,
		ImageURI:    req.ImageUri,
		StartDate:   time.Unix(int64(req.StartDate), 0), // XXX: overflow?
		EndDate:     time.Unix(int64(req.EndDate), 0),   // XXX: overflow?
		CreatorID:   creatorID,
		TicketPrice: req.TicketPrice,
		Capacity:    req.Capacity,
	}
	if err := g.db.Create(evt).Error; err != nil {
		return 0, err
	}
	return evt.ID, nil
}

// CreateUser implements ZenaoDB.
func (g *gormZenaoDB) CreateUser(clerkID string) (uint, error) {
	user := &User{
		ClerkID: clerkID,
	}
	if err := g.db.Create(user).Error; err != nil {
		return 0, err
	}
	return user.ID, nil
}

// EditUser implements ZenaoDB.
func (g *gormZenaoDB) EditUser(userID uint, req *zenaov1.EditUserRequest) error {
	// XXX: validate?
	user := &User{
		Model:       gorm.Model{ID: userID},
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		AvatarURI:   req.AvatarUri,
	}
	return g.db.Save(user).Error
}

// UserExists implements ZenaoDB.
func (g *gormZenaoDB) UserExists(clerkID string) (uint, error) {
	var user User
	if err := g.db.Where("clerk_id = ?", clerkID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, nil
		}
		return 0, err
	}
	return user.ID, nil
}

var _ ZenaoDB = (*gormZenaoDB)(nil)
