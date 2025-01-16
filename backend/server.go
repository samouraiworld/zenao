package main

import (
	"context"

	"go.uber.org/zap"
)

type ZenaoServer struct {
	Logger  *zap.Logger
	GetUser func(ctx context.Context) ZenaoUser
}

type ZenaoUser struct {
	ID     string
	Banned bool
}
