package main

import (
	"context"

	"github.com/resend/resend-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

type ZenaoServer struct {
	Logger     *zap.Logger
	GetUser    func(ctx context.Context) *ZenaoUser
	CreateUser func(ctx context.Context, email string) (*ZenaoUser, error)
	DBTx       func(func(db ZenaoDB) error) error
	Chain      ZenaoChain
	MailClient *resend.Client
}

type ZenaoUser struct {
	ID     string
	Email  string
	Banned bool
}

// ClerkID is used to create & identify users
// User ID is auto-incremented used for database & on-chain related logic
type ZenaoDB interface {
	CreateUser(clerkID string) (string, error)
	EditUser(userID string, req *zenaov1.EditUserRequest) error
	UserExists(clerkID string) (string, error)

	CreateEvent(creatorID string, req *zenaov1.CreateEventRequest) (string, error)
	EditEvent(eventID string, req *zenaov1.EditEventRequest) error
	GetEvent(eventID string) (*Event, error)
	Participate(eventID string, userID string) error
}

type ZenaoChain interface {
	CreateUser(userID string) error
	EditUser(userID string, req *zenaov1.EditUserRequest) error
	UserAddress(userID string) string

	CreateEvent(eventID string, creatorID string, req *zenaov1.CreateEventRequest) error
	EditEvent(eventID string, req *zenaov1.EditEventRequest) error
	Participate(eventID string, userID string) error
}
