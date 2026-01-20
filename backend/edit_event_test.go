package main

import (
	"context"
	"testing"
	"time"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/samouraiworld/zenao/backend/ztesting"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestEditEventUpdatesPriceGroupCapacity(t *testing.T) {
	for _, tc := range []struct {
		Name                string
		OnboardingState     string
		PaymentVerification string
		ExpectErrorOnEdit   bool
	}{
		{
			Name:                "with_valid_payment_account",
			OnboardingState:     zeni.PaymentOnboardingStateCompleted,
			PaymentVerification: zeni.PaymentVerificationStateVerified,
			ExpectErrorOnEdit:   false,
		},
		{
			Name:                "with_invalid_onboarding_state",
			OnboardingState:     zeni.PaymentOnboardingStateStarted,
			PaymentVerification: zeni.PaymentVerificationStateVerified,
			ExpectErrorOnEdit:   true,
		},
		{
			Name:                "with_invalid_payment_verification",
			OnboardingState:     zeni.PaymentOnboardingStateCompleted,
			PaymentVerification: zeni.PaymentVerificationStatePending,
			ExpectErrorOnEdit:   true,
		},
	} {
		t.Run(tc.Name, func(t *testing.T) {
			db, _ := ztesting.SetupTestDB(t)
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
				OnboardingState:   zeni.PaymentOnboardingStateCompleted,
				StartedAt:         now,
				VerificationState: zeni.PaymentVerificationStateVerified,
				LastVerifiedAt:    &now,
			})
			require.NoError(t, err)

			createResp, err := server.CreateEvent(
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
			require.NoError(t, err)

			initialGroups, err := db.GetPriceGroupsByEvent(createResp.Msg.Id)
			require.NoError(t, err)
			require.Len(t, initialGroups, 1)
			require.Len(t, initialGroups[0].Prices, 1)
			priceGroupID := initialGroups[0].ID
			priceID := initialGroups[0].Prices[0].ID

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

			_, err = server.EditEvent(
				context.Background(),
				connect.NewRequest(&zenaov1.EditEventRequest{
					EventId:     createResp.Msg.Id,
					Title:       "Price test event",
					Description: "test description",
					ImageUri:    "ipfs://image",
					StartDate:   1,
					EndDate:     2,
					Capacity:    150,
					Location: &zenaov1.EventLocation{
						Address: &zenaov1.EventLocation_Virtual{
							Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
						},
					},
					Organizers:     []string{auth.user.ID},
					Gatekeepers:    []string{},
					Discoverable:   true,
					CommunityId:    community.ID,
					CommunityEmail: true,
					PricesGroups: []*zenaov1.EventPriceGroup{
						{
							Id:   priceGroupID,
							Name: "",
							Prices: []*zenaov1.EventPrice{
								{
									AmountMinor:  1500,
									CurrencyCode: "EUR",
									Id:           priceID,
								},
							},
						},
					},
				}),
			)

			if tc.ExpectErrorOnEdit {
				require.Error(t, err)
				return
			} else {
				require.NoError(t, err)
			}

			groups, err := db.GetPriceGroupsByEvent(createResp.Msg.Id)
			require.NoError(t, err)
			require.Len(t, groups, 1)
			require.Equal(t, uint32(150), groups[0].Capacity)
			require.Len(t, groups[0].Prices, 1)
			require.Equal(t, int64(1500), groups[0].Prices[0].AmountMinor)
		})
	}
}

func TestEditEventDoesNotDeletePriceGroups(t *testing.T) {
	db, _ := ztesting.SetupTestDB(t)
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
		OnboardingState:   zeni.PaymentOnboardingStateCompleted,
		StartedAt:         now,
		VerificationState: zeni.PaymentVerificationStateVerified,
		LastVerifiedAt:    &now,
	})
	require.NoError(t, err)

	createResp, err := server.CreateEvent(
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
	require.NoError(t, err)

	_, err = server.EditEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.EditEventRequest{
			EventId:     createResp.Msg.Id,
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
			Organizers:     []string{auth.user.ID},
			Gatekeepers:    []string{},
			Discoverable:   true,
			CommunityId:    community.ID,
			CommunityEmail: true,
			PricesGroups:   []*zenaov1.EventPriceGroup{},
		}),
	)
	require.NoError(t, err)

	groups, err := db.GetPriceGroupsByEvent(createResp.Msg.Id)
	require.NoError(t, err)
	require.Len(t, groups, 1)
	require.Len(t, groups[0].Prices, 1)
}
