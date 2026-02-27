package gzdb_test

import (
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/samouraiworld/zenao/backend/ztesting"
	"github.com/stretchr/testify/require"
)

func TestPriceGroupAndPricePersistence(t *testing.T) {
	db, _ := ztesting.SetupTestDB(t)
	now := time.Now()

	user, err := db.CreateUser("auth-user")
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		user.ID,
		[]string{user.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{
			DisplayName: "Price test community",
			Description: "test",
			AvatarUri:   "ipfs://avatar",
			BannerUri:   "ipfs://banner",
		},
	)
	require.NoError(t, err)

	event, err := db.CreateEvent(
		user.ID,
		[]string{user.ID},
		[]string{},
		&zenaov1.CreateEventRequest{
			Title:       "Price test event",
			Description: "test",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    100,
			CommunityId: community.ID,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
		},
	)
	require.NoError(t, err)
	require.NoError(t, db.AddEventToCommunity(event.ID, community.ID))

	paymentAccount, err := db.UpsertPaymentAccount(&zeni.PaymentAccount{
		CommunityID:       community.ID,
		PlatformType:      "stripe_connect",
		PlatformAccountID: "some_id",
		OnboardingState:   zeni.PaymentOnboardingStateCompleted,
		StartedAt:         now,
		VerificationState: zeni.PaymentVerificationStateVerified,
		LastVerifiedAt:    &now,
	})
	require.NoError(t, err)

	group, err := db.CreatePriceGroup(event.ID, 120)
	require.NoError(t, err)
	require.NotEmpty(t, group.ID)
	require.Equal(t, event.ID, group.EventID)
	require.Equal(t, uint32(120), group.Capacity)

	price, err := db.CreatePrice(nil, &zeni.Price{
		PriceGroupID: group.ID,
		AmountMinor:  2500,
		CurrencyCode: "USD",
	})
	require.Error(t, err)
	require.Empty(t, price)

	price, err = db.CreatePrice(paymentAccount, &zeni.Price{
		PriceGroupID:     group.ID,
		AmountMinor:      2500,
		CurrencyCode:     "USD",
		PaymentAccountID: paymentAccount.ID,
	})
	require.NoError(t, err)
	require.NotEmpty(t, price.ID)

	err = db.UpdatePrice(paymentAccount, &zeni.Price{
		ID:               price.ID,
		AmountMinor:      3000,
		CurrencyCode:     "EUR",
		PaymentAccountID: paymentAccount.ID,
	})
	require.NoError(t, err)

	groups, err := db.GetPriceGroupsByEvent(event.ID)
	require.NoError(t, err)
	require.Len(t, groups, 1)

	prices := groups[0].Prices
	require.NoError(t, err)
	require.Len(t, prices, 1)
	require.Equal(t, int64(3000), prices[0].AmountMinor)
	require.Equal(t, "EUR", prices[0].CurrencyCode)
	require.Equal(t, paymentAccount.ID, prices[0].PaymentAccountID)
}

func TestGetPriceGroupsByEventPrefetchesPricesAndPaymentAccount(t *testing.T) {
	db, _ := ztesting.SetupTestDB(t)

	user, err := db.CreateUser("auth-user")
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		user.ID,
		[]string{user.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{
			DisplayName: "Price test community",
			Description: "test",
			AvatarUri:   "ipfs://avatar",
			BannerUri:   "ipfs://banner",
		},
	)
	require.NoError(t, err)

	now := time.Now().UTC()
	account, err := db.UpsertPaymentAccount(&zeni.PaymentAccount{
		CommunityID:       community.ID,
		PlatformType:      zeni.PaymentPlatformStripeConnect,
		PlatformAccountID: "acct_test_123",
		OnboardingState:   zeni.PaymentOnboardingStateCompleted,
		StartedAt:         now,
		VerificationState: zeni.PaymentVerificationStateVerified,
		LastVerifiedAt:    &now,
	})
	require.NoError(t, err)

	event, err := db.CreateEvent(
		user.ID,
		[]string{user.ID},
		[]string{},
		&zenaov1.CreateEventRequest{
			Title:       "Price group event",
			Description: "test",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    100,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
		},
	)
	require.NoError(t, err)
	require.NoError(t, db.AddEventToCommunity(event.ID, community.ID))

	group, err := db.CreatePriceGroup(event.ID, 120)
	require.NoError(t, err)

	_, err = db.CreatePrice(account, &zeni.Price{
		PriceGroupID:     group.ID,
		AmountMinor:      1200,
		CurrencyCode:     "EUR",
		PaymentAccountID: account.ID,
	})
	require.NoError(t, err)

	groups, err := db.GetPriceGroupsByEvent(event.ID)
	require.NoError(t, err)
	require.Len(t, groups, 1)
	require.Len(t, groups[0].Prices, 1)
	require.NotNil(t, groups[0].Prices[0].PaymentAccount)
	require.Equal(t, account.ID, groups[0].Prices[0].PaymentAccount.ID)
	require.Equal(t, zeni.PaymentPlatformStripeConnect, groups[0].Prices[0].PaymentAccount.PlatformType)
}

func TestCreatePriceRejectsMismatchedCommunityPaymentAccount(t *testing.T) {
	db, _ := ztesting.SetupTestDB(t)

	user, err := db.CreateUser("auth-user")
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		user.ID,
		[]string{user.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{
			DisplayName: "Community A",
			Description: "test",
			AvatarUri:   "ipfs://avatar-a",
			BannerUri:   "ipfs://banner-a",
		},
	)
	require.NoError(t, err)

	otherCommunity, err := db.CreateCommunity(
		user.ID,
		[]string{user.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{
			DisplayName: "Community B",
			Description: "test",
			AvatarUri:   "ipfs://avatar-b",
			BannerUri:   "ipfs://banner-b",
		},
	)
	require.NoError(t, err)

	now := time.Now().UTC()
	otherAccount, err := db.UpsertPaymentAccount(&zeni.PaymentAccount{
		CommunityID:       otherCommunity.ID,
		PlatformType:      zeni.PaymentPlatformStripeConnect,
		PlatformAccountID: "acct_other",
		OnboardingState:   "complete",
		StartedAt:         now,
		VerificationState: "verified",
		LastVerifiedAt:    &now,
	})
	require.NoError(t, err)

	event, err := db.CreateEvent(
		user.ID,
		[]string{user.ID},
		[]string{},
		&zenaov1.CreateEventRequest{
			Title:       "Price group event",
			Description: "test",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    100,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
		},
	)
	require.NoError(t, err)
	require.NoError(t, db.AddEventToCommunity(event.ID, community.ID))

	group, err := db.CreatePriceGroup(event.ID, 120)
	require.NoError(t, err)

	price, err := db.CreatePrice(nil, &zeni.Price{
		PriceGroupID:     group.ID,
		AmountMinor:      1200,
		CurrencyCode:     "USD",
		PaymentAccountID: otherAccount.ID,
	})
	require.Error(t, err)
	require.Nil(t, price)
}

func TestCreatePriceRejectsUnsupportedCurrencyForProvider(t *testing.T) {
	db, _ := ztesting.SetupTestDB(t)

	user, err := db.CreateUser("auth-user")
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		user.ID,
		[]string{user.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{
			DisplayName: "Currency test community",
			Description: "test",
			AvatarUri:   "ipfs://avatar",
			BannerUri:   "ipfs://banner",
		},
	)
	require.NoError(t, err)

	now := time.Now().UTC()
	account, err := db.UpsertPaymentAccount(&zeni.PaymentAccount{
		CommunityID:       community.ID,
		PlatformType:      zeni.PaymentPlatformStripeConnect,
		PlatformAccountID: "acct_test_unsupported",
		OnboardingState:   "complete",
		StartedAt:         now,
		VerificationState: "verified",
		LastVerifiedAt:    &now,
	})
	require.NoError(t, err)

	event, err := db.CreateEvent(
		user.ID,
		[]string{user.ID},
		[]string{},
		&zenaov1.CreateEventRequest{
			Title:       "Price group event",
			Description: "test",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    100,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
		},
	)
	require.NoError(t, err)
	require.NoError(t, db.AddEventToCommunity(event.ID, community.ID))

	group, err := db.CreatePriceGroup(event.ID, 120)
	require.NoError(t, err)

	price, err := db.CreatePrice(account, &zeni.Price{
		PriceGroupID:     group.ID,
		AmountMinor:      1200,
		CurrencyCode:     "cad",
		PaymentAccountID: account.ID,
	})
	require.Error(t, err)
	require.Nil(t, price)
}
