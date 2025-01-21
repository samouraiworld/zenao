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

type ZenaoDB interface {
	CreateEvent(creatorID string, req *zenaov1.CreateEventRequest) (string, error)
	CreateUser(id string, username string) error
}

type ZenaoChain interface {
	CreateEvent(eventID string, creatorID string, req *zenaov1.CreateEventRequest) error
	CreateUser(id string, username string) error
}
