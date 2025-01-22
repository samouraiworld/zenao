package main

import (
	"context"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

type ZenaoServer struct {
	Logger  *zap.Logger
	GetUser func(ctx context.Context) ZenaoUser
	DBTx    func(func(db ZenaoDB) error) error
	Chain   ZenaoChain
}

type ZenaoUser struct {
	ID     string
	Banned bool
}

// ClerkID is used to create & identify users
// User ID is auto-incremented used for database & on-chain related logic
type ZenaoDB interface {
	CreateUser(clerkID string) (uint, error)
	UserExists(clerkID string) (uint, error)
	EditUser(userID uint, req *zenaov1.EditUserRequest) error

	CreateEvent(creatorID uint, req *zenaov1.CreateEventRequest) (uint, error)
}

type ZenaoChain interface {
	CreateUser(userID string) error
	EditUser(userID string, req *zenaov1.EditUserRequest) error

	CreateEvent(eventID string, creatorID string, req *zenaov1.CreateEventRequest) error
}
