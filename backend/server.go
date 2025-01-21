package main

import (
	"context"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zenao/v1/zenaov1connect"
	"go.uber.org/zap"
)

type ZenaoServer struct {
	Logger  *zap.Logger
	GetUser func(ctx context.Context) *ZenaoUser
	DB      ZenaoDB
	Chain   ZenaoChain
}

var _ zenaov1connect.ZenaoServiceHandler = (*ZenaoServer)(nil)

type ZenaoUser struct {
	ID     string
	Banned bool
}

type ZenaoDB interface {
	Tx(func(db ZenaoDB) error) error
	CreateEvent(creatorID string, req *zenaov1.CreateEventRequest) (string, error)
	GetEvent(id string) (*Event, error)
	CreateOrganizer(userID string, stripeAccountID string) (*BusinessAccount, error)
	GetBusinessAccounts(userID string) ([]*BusinessAccount, error)
}

type ZenaoChain interface {
	CreateEvent(eventID string, creatorID string, req *zenaov1.CreateEventRequest) error
}
