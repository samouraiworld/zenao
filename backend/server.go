package main

import (
	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

type ZenaoServer struct {
	Logger       *zap.Logger
	Auth         zeni.Auth
	Chain        zeni.Chain
	DB           zeni.DB
	MailClient   *resend.Client
	DiscordToken string
}
