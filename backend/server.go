package main

import (
	"context"

	"github.com/resend/resend-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

type ZenaoServer struct {
	Logger     *zap.Logger
	GetUser    func(ctx context.Context) ZenaoUser
	DBTx       func(func(db ZenaoDB) error) error
	Chain      ZenaoChain
	MailClient *resend.Client
}

type ZenaoUser struct {
	ID     string
	Email  string
	Banned bool
}

type ZenaoDB interface {
	CreateEvent(creatorID string, req *zenaov1.CreateEventRequest) (string, error)
	CreateUser(id string, req *zenaov1.CreateUserRequest) (string, error)
	Participate(eventID string, userID string) error
	GetEvent(id string) (*Event, error)
}

type ZenaoChain interface {
	CreateEvent(eventID string, creatorID string, req *zenaov1.CreateEventRequest) error
	CreateUser(userID string, req *zenaov1.CreateUserRequest) error
	Participate(eventID string, userID string) error
}
