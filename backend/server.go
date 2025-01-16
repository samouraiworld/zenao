package main

import (
	"context"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

type ZenaoServer struct {
	Logger  *zap.Logger
	GetUser func(ctx context.Context) ZenaoUser
	DB      ZenaoDB
}

type ZenaoUser struct {
	ID     string
	Banned bool
}

type ZenaoDB interface {
	CreateEvent(creatorID string, event *zenaov1.CreateEventRequest) error
}
