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

// stripeAccountBusinessProfile is the merchant legal/business profile mirrored
// from a connected Stripe account, used on the payouts page and purchase emails.
type stripeAccountBusinessProfile struct {
	businessName string
	legalName    string
	supportEmail string
	supportPhone string
	supportURL   string
	address      string
	country      string
}

func deriveStripeAccountBusinessProfile(acct *stripe.Account) stripeAccountBusinessProfile {
	profile := stripeAccountBusinessProfile{}
	if acct == nil {
		return profile
	}

	profile.country = acct.Country

	if acct.BusinessProfile != nil {
		profile.businessName = strings.TrimSpace(acct.BusinessProfile.Name)
		profile.supportEmail = strings.TrimSpace(acct.BusinessProfile.SupportEmail)
		profile.supportPhone = strings.TrimSpace(acct.BusinessProfile.SupportPhone)
		profile.supportURL = strings.TrimSpace(acct.BusinessProfile.SupportURL)
		profile.address = formatStripeAddress(acct.BusinessProfile.SupportAddress)
	}

	if acct.Company != nil {
		profile.legalName = strings.TrimSpace(acct.Company.Name)
		if profile.address == "" {
			profile.address = formatStripeAddress(acct.Company.Address)
		}
	}

	if profile.address == "" && acct.Individual != nil {
		profile.address = formatStripeAddress(acct.Individual.Address)
	}

	return profile
}

// formatStripeAddress renders a Stripe address as a single human-readable line.
func formatStripeAddress(addr *stripe.Address) string {
	if addr == nil {
		return ""
	}
	parts := make([]string, 0, 6)
	for _, p := range []string{addr.Line1, addr.Line2, addr.PostalCode, addr.City, addr.State, addr.Country} {
		if p = strings.TrimSpace(p); p != "" {
			parts = append(parts, p)
		}
	}
	return strings.Join(parts, ", ")
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
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	if req.Msg.CommunityId == "" {
		return nil, errors.New("community id is required")
	}

	var accountData *zeni.PaymentAccount
	if err := s.DB.TxWithSpan(ctx, "db.GetCommunityPayoutStatus", func(tx zeni.DB) error {
		roles, err := tx.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeCommunity, req.Msg.CommunityId)
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
		Currencies:        zeni.ListSupportedStripeCurrencies(),
		BusinessName:      accountData.BusinessName,
		LegalName:         accountData.LegalName,
		SupportEmail:      accountData.SupportEmail,
		SupportPhone:      accountData.SupportPhone,
		SupportUrl:        accountData.SupportURL,
		BusinessAddress:   accountData.BusinessAddress,
		Country:           accountData.Country,
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
	profile := deriveStripeAccountBusinessProfile(stripeAcct)

	if err := s.DB.TxWithSpan(ctx, "db.UpdatePaymentAccountVerification", func(tx zeni.DB) error {
		_, err = tx.UpsertPaymentAccount(&zeni.PaymentAccount{
			CommunityID:       accountData.CommunityID,
			PlatformType:      accountData.PlatformType,
			PlatformAccountID: accountData.PlatformAccountID,
			OnboardingState:   onboardingState,
			StartedAt:         accountData.StartedAt,
			VerificationState: verificationState,
			LastVerifiedAt:    &lastVerifiedAt,
			BusinessName:      profile.businessName,
			LegalName:         profile.legalName,
			SupportEmail:      profile.supportEmail,
			SupportPhone:      profile.supportPhone,
			SupportURL:        profile.supportURL,
			BusinessAddress:   profile.address,
			Country:           profile.country,
		})

		return err
	}); err != nil {
		return nil, err
	}

	response.VerificationState = verificationState
	response.LastVerifiedAt = lastVerifiedAt.Unix()
	response.IsStale = false
	response.OnboardingState = onboardingState
	response.PlatformAccountId = accountData.PlatformAccountID
	response.BusinessName = profile.businessName
	response.LegalName = profile.legalName
	response.SupportEmail = profile.supportEmail
	response.SupportPhone = profile.supportPhone
	response.SupportUrl = profile.supportURL
	response.BusinessAddress = profile.address
	response.Country = profile.country

	return connect.NewResponse(response), nil
}
