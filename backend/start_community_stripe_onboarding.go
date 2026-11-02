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

	gateway := s.onboardingGateway()
	requestCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	identity, err := gateway.Identity(requestCtx)
	if err != nil {
		return nil, errors.New("Stripe platform identity could not be verified")
	}
	scope := zeni.StripeOnboardingScope{CommunityID: req.Msg.CommunityId, ActorID: actor.ID(), PlatformAccountID: identity.AccountID, LiveMode: identity.LiveMode}
	verifiedExistingID := ""
	if existingAccount != nil && existingAccount.PlatformAccountID != "" {
		a, e := gateway.Get(requestCtx, existingAccount.PlatformAccountID)
		if e != nil || a == nil || a.ID != existingAccount.PlatformAccountID || a.ID == identity.AccountID {
			return nil, zeni.ErrOnboardingReconciliation
		}
		verifiedExistingID = a.ID
	}
	claim, err := s.DB.WithContext(ctx).ClaimStripeOnboarding(scope, verifiedExistingID, s.onboardingNow())
	if err != nil {
		return nil, err
	}
	accountID := claim.AccountID
	if accountID == "" {
		a, e := gateway.Create(requestCtx, claim.IdempotencyKey, claim.OperationID)
		if e != nil || a == nil || a.ID == "" {
			// Even an HTTP 500/cancel can have created an account. Preserve the
			// original key/clock; never generate a new operation on this error.
			state := "unknown"
			var se *stripe.Error
			if errors.As(e, &se) && (se.HTTPStatusCode == 400 || se.HTTPStatusCode == 401 || se.HTTPStatusCode == 403) {
				state = "blocked"
			}
			if finishErr := s.DB.WithContext(ctx).FinishStripeOnboarding(claim, state, s.onboardingNow()); finishErr != nil {
				return nil, finishErr
			}
			return nil, errors.New("Stripe account creation needs retry or reconciliation")
		}
		accountID = a.ID
		if e = s.DB.WithContext(ctx).CompleteStripeOnboardingAccount(claim, accountID, s.onboardingNow()); e != nil {
			return nil, e
		}
	}
	link, err := gateway.Link(requestCtx, accountID, returnURL, refreshURL)
	if err != nil || link == "" {
		if e := s.DB.WithContext(ctx).FinishStripeOnboarding(claim, "known", s.onboardingNow()); e != nil {
			return nil, e
		}
		return nil, errors.New("Stripe onboarding link unavailable; retry resumes the same account")
	}
	// A late worker may not publish its URL after losing its claim.
	if err = s.DB.WithContext(ctx).FinishStripeOnboarding(claim, "known", s.onboardingNow()); err != nil {
		return nil, err
	}
	return connect.NewResponse(&zenaov1.StartCommunityStripeOnboardingResponse{OnboardingUrl: link}), nil
}
