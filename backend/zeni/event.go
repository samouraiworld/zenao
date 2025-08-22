package zeni

import (
	"errors"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

type Event struct {
	CreatedAt         time.Time
	ID                string
	Title             string
	Description       string
	StartDate         time.Time
	EndDate           time.Time
	ImageURI          string
	TicketPrice       float64
	Capacity          uint32
	CreatorID         string
	Location          *zenaov1.EventLocation
	PasswordHash      string
	ICSSequenceNumber uint32
}

func NewEvent(creatorID string, eventID string, req *zenaov1.CreateEventRequest) (*Event, error) {
	passwordHash, err := newPasswordHash(req.Password)
	if err != nil {
		return nil, errors.New("failed to create password hash: " + err.Error())
	}
	return &Event{
		ID:                eventID,
		Title:             req.Title,
		Description:       req.Description,
		StartDate:         time.Unix(int64(req.StartDate), 0),
		EndDate:           time.Unix(int64(req.EndDate), 0),
		ImageURI:          req.ImageUri,
		TicketPrice:       req.TicketPrice,
		Capacity:          req.Capacity,
		CreatorID:         creatorID,
		Location:          req.Location,
		PasswordHash:      passwordHash,
		ICSSequenceNumber: 0,
	}, nil
}
