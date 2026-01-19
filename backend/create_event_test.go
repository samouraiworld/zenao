package main

import (
	"context"
	"testing"
	"time"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestCreateEventCreatesPriceGroups(t *testing.T) {
	for _, tc := range []struct {
		Name                string
		OnboardingState     string
		PaymentVerification string
		ExpectErrorOnCreate bool
	}{
		{
			Name:                "with_valid_payment_account",
			OnboardingState:     zeni.PaymentOnboardingStateCompleted,
			PaymentVerification: zeni.PaymentVerificationStateVerified,
			ExpectErrorOnCreate: false,
		},
		{
			Name:                "with_invalid_onboarding_state",
			OnboardingState:     zeni.PaymentOnboardingStateStarted,
			PaymentVerification: zeni.PaymentVerificationStateVerified,
			ExpectErrorOnCreate: true,
		},
		{
			Name:                "with_invalid_payment_verification",
			OnboardingState:     zeni.PaymentOnboardingStateCompleted,
			PaymentVerification: zeni.PaymentVerificationStatePending,
			ExpectErrorOnCreate: true,
		},
	} {
		t.Run(tc.Name, func(t *testing.T) {
			db := setupPriceRPCDB(t)
			auth := &priceStubAuth{user: &zeni.AuthUser{ID: "auth-user"}}
			server := &ZenaoServer{
				Logger: zap.NewNop(),
				Auth:   auth,
				DB:     db,
			}

			user, err := db.CreateUser(auth.user.ID)
			require.NoError(t, err)

			community, err := db.CreateCommunity(
				user.ID,
				[]string{user.ID},
				[]string{},
				[]string{},
				&zenaov1.CreateCommunityRequest{DisplayName: "Test"},
			)
			require.NoError(t, err)

			now := time.Now().UTC()
			_, err = db.UpsertPaymentAccount(&zeni.PaymentAccount{
				CommunityID:       community.ID,
				PlatformType:      zeni.PaymentPlatformStripeConnect,
				PlatformAccountID: "acct_123",
				OnboardingState:   tc.OnboardingState,
				StartedAt:         now,
				VerificationState: tc.PaymentVerification,
				LastVerifiedAt:    &now,
			})
			require.NoError(t, err)

			resp, err := server.CreateEvent(
				context.Background(),
				connect.NewRequest(&zenaov1.CreateEventRequest{
					Title:       "Price test event",
					Description: "test description",
					ImageUri:    "ipfs://image",
					StartDate:   1,
					EndDate:     2,
					Capacity:    100,
					Location: &zenaov1.EventLocation{
						Address: &zenaov1.EventLocation_Virtual{
							Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
						},
					},
					CommunityId: community.ID,
					PricesGroups: []*zenaov1.EventPriceGroup{
						{
							Name: "",
							Prices: []*zenaov1.EventPrice{
								{
									AmountMinor:  1200,
									CurrencyCode: "EUR",
								},
							},
						},
					},
				}),
			)
			if tc.ExpectErrorOnCreate {
				require.Error(t, err)
				return
			} else {
				require.NoError(t, err)
			}

			account, err := db.GetPaymentAccountByCommunityPlatform(community.ID, zeni.PaymentPlatformStripeConnect)
			require.NoError(t, err)
			require.NotNil(t, account)

			groups, err := db.GetPriceGroupsByEvent(resp.Msg.Id)
			require.NoError(t, err)
			require.Len(t, groups, 1)
			require.Equal(t, uint32(100), groups[0].Capacity)
			require.Len(t, groups[0].Prices, 1)
			require.Equal(t, int64(1200), groups[0].Prices[0].AmountMinor)
			require.Equal(t, "EUR", groups[0].Prices[0].CurrencyCode)
			require.Equal(t, account.ID, groups[0].Prices[0].PaymentAccountID)
		})
	}
}

func TestCreateEventRejectsPaidPriceWithoutPaymentAccount(t *testing.T) {
	db := setupPriceRPCDB(t)
	auth := &priceStubAuth{user: &zeni.AuthUser{ID: "auth-user"}}
	server := &ZenaoServer{
		Logger: zap.NewNop(),
		Auth:   auth,
		DB:     db,
	}

	user, err := db.CreateUser(auth.user.ID)
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		user.ID,
		[]string{user.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{DisplayName: "Test"},
	)
	require.NoError(t, err)

	_, err = server.CreateEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.CreateEventRequest{
			Title:       "Price test event",
			Description: "test description",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    100,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
			CommunityId: community.ID,
			PricesGroups: []*zenaov1.EventPriceGroup{
				{
					Name: "",
					Prices: []*zenaov1.EventPrice{
						{
							AmountMinor:  1200,
							CurrencyCode: "EUR",
						},
					},
				},
			},
		}),
	)
	require.Error(t, err)
}
