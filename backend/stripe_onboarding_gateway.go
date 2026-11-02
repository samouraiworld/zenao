package main

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/stripe/stripe-go/v84"
)

type stripeGatewayIdentity struct {
	AccountID string
	LiveMode  bool
}
type stripeOnboardingGateway interface {
	Identity(context.Context) (stripeGatewayIdentity, error)
	Create(context.Context, string, string) (*stripe.Account, error)
	Get(context.Context, string) (*stripe.Account, error)
	Link(context.Context, string, string, string) (string, error)
}

// All methods use one immutable client. Other payment code's global stripe.Key
// cannot change the credential between identity inspection and creation.
type credentialStripeGateway struct {
	client *stripe.Client
	live   bool
	valid  bool
}

func newCredentialStripeGateway(key string) *credentialStripeGateway {
	return &credentialStripeGateway{client: stripe.NewClient(key), live: strings.HasPrefix(key, "sk_live_") || strings.HasPrefix(key, "rk_live_"), valid: strings.HasPrefix(key, "sk_live_") || strings.HasPrefix(key, "rk_live_") || strings.HasPrefix(key, "sk_test_") || strings.HasPrefix(key, "rk_test_")}
}
func (g *credentialStripeGateway) Identity(ctx context.Context) (stripeGatewayIdentity, error) {
	if !g.valid {
		return stripeGatewayIdentity{}, errors.New("unsupported Stripe credential mode")
	}
	a, err := g.client.V1Accounts.Retrieve(ctx, nil)
	if err != nil {
		return stripeGatewayIdentity{}, err
	}
	if a == nil || a.ID == "" {
		return stripeGatewayIdentity{}, errors.New("Stripe identity unavailable")
	}
	return stripeGatewayIdentity{AccountID: a.ID, LiveMode: g.live}, nil
}
func (g *credentialStripeGateway) Create(ctx context.Context, key, operation string) (*stripe.Account, error) {
	p := &stripe.AccountCreateParams{Type: stripe.String("standard"), Capabilities: &stripe.AccountCreateCapabilitiesParams{CardPayments: &stripe.AccountCreateCapabilitiesCardPaymentsParams{Requested: stripe.Bool(true)}, Transfers: &stripe.AccountCreateCapabilitiesTransfersParams{Requested: stripe.Bool(true)}}, Metadata: map[string]string{"zenao_operation": operation, "zenao_operation_version": "1"}}
	p.SetIdempotencyKey(key)
	return g.client.V1Accounts.Create(ctx, p)
}
func (g *credentialStripeGateway) Get(ctx context.Context, id string) (*stripe.Account, error) {
	return g.client.V1Accounts.GetByID(ctx, id, nil)
}
func (g *credentialStripeGateway) Link(ctx context.Context, id, returnURL, refreshURL string) (string, error) {
	a, err := g.client.V1AccountLinks.Create(ctx, &stripe.AccountLinkCreateParams{Account: stripe.String(id), ReturnURL: stripe.String(returnURL), RefreshURL: stripe.String(refreshURL), Type: stripe.String("account_onboarding")})
	if err != nil {
		return "", err
	}
	if a == nil || a.URL == "" {
		return "", errors.New("Stripe account link unavailable")
	}
	return a.URL, nil
}
func (s *ZenaoServer) onboardingGateway() stripeOnboardingGateway {
	if s.StripeOnboardingGateway != nil {
		return s.StripeOnboardingGateway
	}
	return newCredentialStripeGateway(s.StripeSecretKey)
}
func (s *ZenaoServer) onboardingNow() time.Time {
	if s.StripeOnboardingClock != nil {
		return s.StripeOnboardingClock().UTC()
	}
	return time.Now().UTC()
}
