package main

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"slices"
	"strings"
	"time"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/stripe/stripe-go/v84"
	"github.com/stripe/stripe-go/v84/account"
	"github.com/stripe/stripe-go/v84/accountlink"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func buildCallbackURL(baseURL string, rawPath string) (string, error) {
	if rawPath == "" {
		return "", errors.New("path is required")
	}
	if strings.Contains(rawPath, "\\") {
		return "", errors.New("path contains invalid characters")
	}
	if !strings.HasPrefix(rawPath, "/") {
		return "", errors.New("path must start with /")
	}
	if strings.Contains(rawPath, "..") {
		return "", errors.New("path contains invalid segments")
	}

	parsedPath, err := url.Parse(rawPath)
	if err != nil {
		return "", fmt.Errorf("parse path: %w", err)
	}
	if parsedPath.IsAbs() || parsedPath.Host != "" || parsedPath.Scheme != "" {
		return "", errors.New("path must be relative")
	}

	base, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("parse base URL: %w", err)
	}
	if base.Scheme == "" || base.Host == "" {
		return "", errors.New("base URL must include scheme and host")
	}
	if base.Scheme != "https" && base.Scheme != "http" {
		return "", errors.New("base URL must be http or https")
	}

	return base.ResolveReference(&url.URL{
		Path:     parsedPath.Path,
		RawQuery: parsedPath.RawQuery,
		Fragment: parsedPath.Fragment,
	}).String(), nil
}

func (s *ZenaoServer) StartCommunityStripeOnboarding(
	ctx context.Context,
	req *connect.Request[zenaov1.StartCommunityStripeOnboardingRequest],
) (*connect.Response[zenaov1.StartCommunityStripeOnboardingResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	if req.Msg.CommunityId == "" {
		return nil, errors.New("community id is required")
	}

	if s.StripeSecretKey == "" || s.AppBaseURL == "" {
		return nil, errors.New("stripe onboarding is not configured")
	}

	returnURL, err := buildCallbackURL(s.AppBaseURL, req.Msg.ReturnPath)
	if err != nil {
		return nil, err
	}
	refreshURL, err := buildCallbackURL(s.AppBaseURL, req.Msg.RefreshPath)
	if err != nil {
		return nil, err
	}

	if req.Msg.ReturnPath == "" || req.Msg.RefreshPath == "" {
		return nil, errors.New("return and refresh paths are required")
	}

	s.Logger.Info("start-stripe-onboarding",
		zap.String("community-id", req.Msg.CommunityId),
		zap.String("user-id", actor.ID()),
	)

	var existingAccount *zeni.PaymentAccount
	if err := s.DB.TxWithSpan(ctx, "db.StartStripeOnboarding", func(tx zeni.DB) error {
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeCommunity, req.Msg.CommunityId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleAdministrator) {
			return errors.New("you must be an administrator of the community to start onboarding")
		}

		existingAccount, err = tx.GetPaymentAccountByCommunityPlatform(req.Msg.CommunityId, zeni.PaymentPlatformStripeConnect)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	if existingAccount != nil && existingAccount.OnboardingState == zeni.PaymentOnboardingStateCompleted {
		return nil, errors.New("stripe already connected")
	}

	accountID := ""
	if existingAccount != nil {
		// TODO: check if account is still active, return an error if not
		accountID = existingAccount.PlatformAccountID
	}
	if accountID == "" {
		params := &stripe.AccountParams{
			Type: stripe.String(string(stripe.AccountTypeStandard)),
			Capabilities: &stripe.AccountCapabilitiesParams{
				CardPayments: &stripe.AccountCapabilitiesCardPaymentsParams{Requested: stripe.Bool(true)},
				Transfers:    &stripe.AccountCapabilitiesTransfersParams{Requested: stripe.Bool(true)},
			},
		}

		// NOTE: If DB persistence fails, retries will reuse this account while the idempotency window is active.
		params.SetIdempotencyKey(fmt.Sprintf("account.New.Community:%s", req.Msg.CommunityId))

		acct, err := account.New(params)
		if err != nil {
			return nil, fmt.Errorf("create stripe account: %w", err)
		}
		accountID = acct.ID
	}

	link, err := accountlink.New(&stripe.AccountLinkParams{
		Account:    stripe.String(accountID),
		RefreshURL: stripe.String(refreshURL),
		ReturnURL:  stripe.String(returnURL),
		Type:       stripe.String(string(stripe.AccountLinkTypeAccountOnboarding)),
	})
	if err != nil {
		return nil, fmt.Errorf("create stripe account link: %w", err)
	}

	if err := s.DB.TxWithSpan(ctx, "db.UpsertPaymentAccount", func(tx zeni.DB) error {
		return tx.UpsertPaymentAccount(&zeni.PaymentAccount{
			CommunityID:       req.Msg.CommunityId,
			PlatformType:      zeni.PaymentPlatformStripeConnect,
			PlatformAccountID: accountID,
			OnboardingState:   zeni.PaymentOnboardingStateStarted,
			StartedAt:         time.Now().UTC(),
			VerificationState: zeni.PaymentVerificationStatePending,
		})
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.StartCommunityStripeOnboardingResponse{OnboardingUrl: link.URL}), nil
}
