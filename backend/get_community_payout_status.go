package main

import (
	"context"
	"errors"
	"slices"
	"strings"
	"time"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/stripe/stripe-go/v84"
	"github.com/stripe/stripe-go/v84/account"
	"gorm.io/gorm"
)

const (
	stripeAccountVerificationTTL = 5 * time.Minute
)

var stripeAccountGetByID = account.GetByID

func shouldRefreshStripeAccountVerification(lastVerifiedAt *time.Time, now time.Time, ttl time.Duration) bool {
	if lastVerifiedAt == nil {
		return true
	}
	return now.Sub(*lastVerifiedAt) >= ttl
}

func deriveStripeAccountVerificationState(acct *stripe.Account) string {
	if acct == nil {
		return zeni.PaymentVerificationStatePending
	}
	if acct.DetailsSubmitted && acct.ChargesEnabled && acct.PayoutsEnabled {
		return zeni.PaymentVerificationStateVerified
	}
	if acct.Requirements != nil && acct.Requirements.DisabledReason != "" {
		disabledReason := acct.Requirements.DisabledReason
		if strings.HasPrefix(string(disabledReason), "rejected") {
			return zeni.PaymentVerificationStateFailed
		}
		if !acct.ChargesEnabled && !acct.PayoutsEnabled {
			return zeni.PaymentVerificationStateFailed
		}
	}
	return zeni.PaymentVerificationStatePending
}

func (s *ZenaoServer) GetCommunityPayoutStatus(
	ctx context.Context,
	req *connect.Request[zenaov1.GetCommunityPayoutStatusRequest],
) (*connect.Response[zenaov1.GetCommunityPayoutStatusResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if req.Msg.CommunityId == "" {
		return nil, errors.New("community id is required")
	}

	var accountData *zeni.PaymentAccount
	if err := s.DB.TxWithSpan(ctx, "db.GetCommunityPayoutStatus", func(tx zeni.DB) error {
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeCommunity, req.Msg.CommunityId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleAdministrator) {
			return errors.New("user is not administrator of the community")
		}

		accountData, err = tx.GetPaymentAccountByCommunityPlatform(req.Msg.CommunityId, zeni.PaymentPlatformStripeConnect)
		if err != nil {
			return err
		}
		if accountData == nil {
			return errors.New("payment account not found")
		}
		return nil
	}); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return connect.NewResponse(&zenaov1.GetCommunityPayoutStatusResponse{
				VerificationState: zeni.PaymentVerificationStateMissingAccount,
				OnboardingState:   zeni.PaymentOnboardingStateMissingAccount,
			}), nil
		}

		return nil, err
	}

	if accountData.PlatformAccountID == "" {
		return nil, errors.New("payment account is missing stripe account id")
	}

	response := &zenaov1.GetCommunityPayoutStatusResponse{
		VerificationState: accountData.VerificationState,
		IsStale:           false,
		OnboardingState:   accountData.OnboardingState,
		PlatformAccountId: accountData.PlatformAccountID,
	}

	if accountData.LastVerifiedAt != nil {
		response.LastVerifiedAt = accountData.LastVerifiedAt.Unix()
	}

	now := time.Now().UTC()
	if !shouldRefreshStripeAccountVerification(accountData.LastVerifiedAt, now, stripeAccountVerificationTTL) {
		return connect.NewResponse(response), nil
	}

	if s.StripeSecretKey == "" {
		response.RefreshError = "stripe is not configured"
		response.IsStale = true
		return connect.NewResponse(response), nil
	}

	stripeAcct, err := stripeAccountGetByID(accountData.PlatformAccountID, nil)
	if err != nil {
		response.RefreshError = err.Error()
		response.IsStale = true
		return connect.NewResponse(response), nil
	}

	verificationState := deriveStripeAccountVerificationState(stripeAcct)
	onboardingState := accountData.OnboardingState
	if stripeAcct.DetailsSubmitted && onboardingState != zeni.PaymentOnboardingStateCompleted {
		onboardingState = zeni.PaymentOnboardingStateCompleted
	}
	lastVerifiedAt := now

	if err := s.DB.TxWithSpan(ctx, "db.UpdatePaymentAccountVerification", func(tx zeni.DB) error {
		return tx.UpsertPaymentAccount(&zeni.PaymentAccount{
			CommunityID:       accountData.CommunityID,
			PlatformType:      accountData.PlatformType,
			PlatformAccountID: accountData.PlatformAccountID,
			OnboardingState:   onboardingState,
			StartedAt:         accountData.StartedAt,
			VerificationState: verificationState,
			LastVerifiedAt:    &lastVerifiedAt,
		})
	}); err != nil {
		return nil, err
	}

	response.VerificationState = verificationState
	response.LastVerifiedAt = lastVerifiedAt.Unix()
	response.IsStale = false
	response.OnboardingState = onboardingState
	response.PlatformAccountId = accountData.PlatformAccountID

	return connect.NewResponse(response), nil
}
