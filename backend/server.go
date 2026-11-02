package main

import (
	"time"

	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/payment"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

type ZenaoServer struct {
	AppBaseURL              string
	Logger                  *zap.Logger
	Auth                    zeni.Auth
	DB                      zeni.DB
	MailClient              *resend.Client
	MailSender              string
	DiscordToken            string
	Maintenance             bool
	StripeSecretKey         string
	StripeOnboardingGateway stripeOnboardingGateway
	StripeOnboardingClock   func() time.Time
	PaidEventsEnabled       bool
	PaymentProviders        map[string]payment.Payment
}
