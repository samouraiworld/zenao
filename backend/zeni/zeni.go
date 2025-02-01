package zeni

import (
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

type User struct {
	ID     string
	Email  string
	Banned bool
}

type DBUser struct {
	ID string
}

type Event struct {
	ID          string
	Title       string
	Description string
	StartDate   time.Time
	EndDate     time.Time
	ImageURI    string
	TicketPrice float64
	Capacity    uint32
	Location    string
	CreatorID   string
}

// authID is the user id coming from the auth system.
// userID is an internal zenao user id.
type DB interface {
	Tx(func(db DB) error) error

	CreateUser(authID string) (string, error)
	UserExists(authID string) (string, error)

	EditUser(userID string, req *zenaov1.EditUserRequest) error
	UserRoles(userID string, eventID string) ([]string, error)
	GetAllUsers() ([]*DBUser, error)

	CreateEvent(creatorID string, req *zenaov1.CreateEventRequest) (*Event, error)
	EditEvent(eventID string, req *zenaov1.EditEventRequest) error
	GetEvent(eventID string) (*Event, error)
	Participate(eventID string, userID string) error
	GetAllEvents() ([]*Event, error)
	GetAllParticipants(eventID string) ([]*DBUser, error)
}

type Chain interface {
	CreateUser(userID string) error
	EditUser(userID string, req *zenaov1.EditUserRequest) error
	UserAddress(userID string) string

	CreateEvent(eventID string, creatorID string, req *zenaov1.CreateEventRequest) error
	EditEvent(eventID string, req *zenaov1.EditEventRequest) error
	Participate(eventID string, userID string) error
}
