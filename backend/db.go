package main

import (
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

func setupDB() (*gormZenaoDB, error) {
	db, err := gorm.Open(sqlite.Open("dev.db"), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Migrate the schema
	if err := db.AutoMigrate(&Event{}, &SoldTicket{}); err != nil {
		return nil, err
	}

	return &gormZenaoDB{db: db}, nil
}

type gormZenaoDB struct {
	db *gorm.DB
}

// CreateEvent implements ZenaoDB.
func (g *gormZenaoDB) CreateEvent(creatorID string, event *zenaov1.CreateEventRequest) error {
	// XXX: validate?
	return g.db.Create(&Event{
		Title:       event.Title,
		Description: event.Description,
		ImageURI:    event.ImageUri,
		StartDate:   time.Unix(int64(event.StartDate), 0), // XXX: overflow?
		EndDate:     time.Unix(int64(event.EndDate), 0),   // XXX: overflow?
		CreatorID:   creatorID,
		TicketPrice: event.TicketPrice,
		Capacity:    event.Capacity,
	}).Error
}

var _ ZenaoDB = (*gormZenaoDB)(nil)
