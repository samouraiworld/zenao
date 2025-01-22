package main

import (
	"fmt"
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
	CreatorID   string
}

type SoldTicket struct {
	gorm.Model
	EventID uint
	UserID  string
	Price   float64
}

type User struct {
	ID          string `gorm:"primaryKey"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
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
		return "", err
	}
	return fmt.Sprintf("%d", evt.ID), nil
}

// CreateUser implements ZenaoDB.
func (g *gormZenaoDB) CreateUser(userID string) (string, error) {
	user := &User{
		ID: userID,
	}
	if err := g.db.Create(user).Error; err != nil {
		return "", err
	}
	return user.ID, nil
}

// EditUser implements ZenaoDB.
func (g *gormZenaoDB) EditUser(userID string, req *zenaov1.EditUserRequest) error {
	// XXX: validate?
	user := &User{
		ID:          userID,
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		AvatarURI:   req.AvatarUri,
	}
	return g.db.Save(user).Error
}

// UserExists implements ZenaoDB.
func (g *gormZenaoDB) UserExists(userID string) (bool, error) {
	var count int64
	if err := g.db.Model(&User{}).Where("id = ?", userID).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

var _ ZenaoDB = (*gormZenaoDB)(nil)
