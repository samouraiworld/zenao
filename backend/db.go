package main

import (
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
	CreatorID   string
}

type BusinessAccount struct {
	UserID          string `gorm:"primaryKey"`
	StripeAccountID string `gorm:"primaryKey"`
}

type SoldTicket struct {
	gorm.Model
	EventID uint
	UserID  string
	Price   float64
}

func setupLocalDB(path string) (*gormZenaoDB, error) {
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Migrate the schema
	if err := db.AutoMigrate(&Event{}, &SoldTicket{}, &BusinessAccount{}); err != nil {
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

// GetEvent implements ZenaoDB.
func (g *gormZenaoDB) GetEvent(id string) (*Event, error) {
	idUint, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		return nil, err
	}
	var evt Event
	evt.ID = uint(idUint)
	if err := g.db.First(&evt).Error; err != nil {
		return nil, err
	}
	return &evt, err
}

// CreateOrganizer implements ZenaoDB.
func (g *gormZenaoDB) CreateOrganizer(userID string, stripeAccountID string) (*BusinessAccount, error) {
	org := BusinessAccount{UserID: userID, StripeAccountID: stripeAccountID}
	if err := g.db.Create(&org).Error; err != nil {
		return nil, err
	}
	return &org, nil
}

// GetBusinessAccounts implements ZenaoDB.
func (g *gormZenaoDB) GetBusinessAccounts(userID string) ([]*BusinessAccount, error) {
	var accs []*BusinessAccount
	result := g.db.Find(&accs).Where("user_id = ?", userID)
	if result.Error != nil {
		return nil, result.Error
	}
	return accs, nil
}

var _ ZenaoDB = (*gormZenaoDB)(nil)
