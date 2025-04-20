package main

import (
	"context"

	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

type ZenaoServer struct {
	Logger              *zap.Logger
	GetUser             func(ctx context.Context) *zeni.AuthUser
	GetUserFromClerkIDs func(ctx context.Context, ids []string) ([]*zeni.AuthUser, error)
	CreateUser          func(ctx context.Context, email string) (*zeni.AuthUser, error)
	Chain               zeni.Chain
	DB                  zeni.DB
	MailClient          *resend.Client
	DiscordToken        string
}
