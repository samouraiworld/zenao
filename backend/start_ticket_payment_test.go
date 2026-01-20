package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"testing"
	"time"

	"connectrpc.com/connect"
	_ "github.com/mattn/go-sqlite3"
	"github.com/samouraiworld/zenao/backend/payment"
	"github.com/samouraiworld/zenao/backend/payment/zpstripe"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/samouraiworld/zenao/backend/ztesting"
	"github.com/stretchr/testify/require"
	"github.com/stripe/stripe-go/v84"
	"go.uber.org/zap"
)

type ticketPaymentStubAuth struct {
	user      *zeni.AuthUser
	knownAuth map[string]*zeni.AuthUser
}

func testPaymentProviders(stripeSecretKey string) map[string]payment.Payment {
	stripeProvider := zpstripe.NewStripe(stripeSecretKey)
	return map[string]payment.Payment{
		stripeProvider.PlatformType(): stripeProvider,
	}
}

func requireStripeAccountParam(t *testing.T, params *stripe.CheckoutSessionParams, expected string) {
	t.Helper()
	if params == nil || params.StripeAccount == nil {
		t.Fatalf("expected stripe account %q to be set", expected)
	}
	require.Equal(t, expected, *params.StripeAccount)
	require.NotNil(t, params.ExpiresAt)
}

func (a *ticketPaymentStubAuth) GetUser(ctx context.Context) *zeni.AuthUser {
	return a.user
}

func (a *ticketPaymentStubAuth) GetUsersFromIDs(ctx context.Context, ids []string) ([]*zeni.AuthUser, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	users := make([]*zeni.AuthUser, 0, len(ids))
	for _, id := range ids {
		for _, auth := range a.knownAuth {
			if auth.ID == id {
				users = append(users, auth)
				break
			}
		}
	}
	return users, nil
}

func (a *ticketPaymentStubAuth) EnsureUserExists(ctx context.Context, email string) (*zeni.AuthUser, error) {
	if email == "" {
		return nil, errors.New("email is required")
	}
	return a.ensureAuthUser(email), nil
}

func (a *ticketPaymentStubAuth) EnsureUsersExists(ctx context.Context, emails []string) ([]*zeni.AuthUser, error) {
	users := make([]*zeni.AuthUser, 0, len(emails))
	for _, email := range emails {
		if email == "" {
			return nil, errors.New("email is required")
		}
		users = append(users, a.ensureAuthUser(email))
	}
	return users, nil
}

func (a *ticketPaymentStubAuth) WithAuth() func(http.Handler) http.Handler {
	return func(handler http.Handler) http.Handler { return handler }
}

func (a *ticketPaymentStubAuth) ensureAuthUser(email string) *zeni.AuthUser {
	if a.knownAuth == nil {
		a.knownAuth = make(map[string]*zeni.AuthUser)
	}
	if existing, ok := a.knownAuth[email]; ok {
		return existing
	}
	auth := &zeni.AuthUser{
		ID:    fmt.Sprintf("auth-%s", email),
		Email: email,
	}
	a.knownAuth[email] = auth
	return auth
}

func TestStartTicketPaymentCreatesOrderAndHold(t *testing.T) {
	db, sqlDB := ztesting.SetupTestDB(t)
	organizerAuth := &ticketPaymentStubAuth{}
	organizerAuth.user = organizerAuth.ensureAuthUser("org@example.com")
	organizerServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             organizerAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	organizer, err := db.CreateUser(organizerAuth.user.ID)
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		organizer.ID,
		[]string{organizer.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{DisplayName: "Test community"},
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

	createResp, err := organizerServer.CreateEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.CreateEventRequest{
			Title:       "Paid event",
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
			CommunityId:  community.ID,
			Discoverable: true,
			PricesGroups: []*zenaov1.EventPriceGroup{
				{
					Prices: []*zenaov1.EventPrice{{
						AmountMinor:  2500,
						CurrencyCode: "EUR",
					}},
				},
			},
		}),
	)
	require.NoError(t, err)

	priceGroups, err := db.GetPriceGroupsByEvent(createResp.Msg.Id)
	require.NoError(t, err)
	require.Len(t, priceGroups, 1)
	require.Len(t, priceGroups[0].Prices, 1)
	priceID := priceGroups[0].Prices[0].ID

	originalStripeNew := zpstripe.CheckoutSessionNew
	zpstripe.CheckoutSessionNew = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
		requireStripeAccountParam(t, params, "acct_123")
		return &stripe.CheckoutSession{ID: "cs_test_123", URL: "https://checkout.test"}, nil
	}
	t.Cleanup(func() { zpstripe.CheckoutSessionNew = originalStripeNew })

	checkoutAuth := &ticketPaymentStubAuth{}
	checkoutAuth.user = checkoutAuth.ensureAuthUser("actor@example.com")
	_, err = db.CreateUser(checkoutAuth.user.ID)
	require.NoError(t, err)
	checkoutServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	startTimestamp := time.Now().Unix()
	resp, err := checkoutServer.StartTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.StartTicketPaymentRequest{
			EventId: createResp.Msg.Id,
			LineItems: []*zenaov1.StartTicketPaymentLineItem{
				{
					PriceId:       priceID,
					AttendeeEmail: "buyer@example.com",
				},
				{
					PriceId:       priceID,
					AttendeeEmail: "guest@example.com",
				},
			},
			Password:    "",
			SuccessPath: fmt.Sprintf("/event/%s", createResp.Msg.Id),
			CancelPath:  fmt.Sprintf("/event/%s", createResp.Msg.Id),
		}),
	)
	endTimestamp := time.Now().Unix()
	require.NoError(t, err)
	require.Equal(t, "https://checkout.test", resp.Msg.CheckoutUrl)
	require.NotEmpty(t, resp.Msg.OrderId)

	row := sqlDB.QueryRow("SELECT amount_minor, currency_code, status, payment_provider, payment_session_id FROM orders WHERE id = ?", resp.Msg.OrderId)
	var amountMinor int64
	var currencyCode string
	var status string
	var provider sql.NullString
	var sessionID sql.NullString
	require.NoError(t, row.Scan(&amountMinor, &currencyCode, &status, &provider, &sessionID))
	require.Equal(t, int64(5000), amountMinor)
	require.Equal(t, "EUR", currencyCode)
	require.Equal(t, string(zeni.OrderStatusPending), status)
	require.True(t, provider.Valid)
	require.Equal(t, zeni.PaymentPlatformStripeConnect, provider.String)
	require.True(t, sessionID.Valid)
	require.Equal(t, "cs_test_123", sessionID.String)

	userRows, err := sqlDB.Query("SELECT id, auth_id FROM users WHERE auth_id IN (?, ?)", "auth-buyer@example.com", "auth-guest@example.com")
	require.NoError(t, err)
	t.Cleanup(func() { _ = userRows.Close() })
	userIDs := make(map[string]int64)
	for userRows.Next() {
		var id int64
		var authID sql.NullString
		require.NoError(t, userRows.Scan(&id, &authID))
		if authID.Valid {
			userIDs[authID.String] = id
		}
	}
	require.NoError(t, userRows.Err())
	require.Len(t, userIDs, 2)

	attendeeRows, err := sqlDB.Query("SELECT user_id, price_id, price_group_id, amount_minor, currency_code FROM order_attendees WHERE order_id = ? ORDER BY user_id ASC", resp.Msg.OrderId)
	require.NoError(t, err)
	t.Cleanup(func() { _ = attendeeRows.Close() })
	type attendeeRecord struct {
		userID       int64
		priceID      int64
		priceGroupID int64
		amountMinor  int64
		currencyCode string
	}
	records := make([]attendeeRecord, 0)
	for attendeeRows.Next() {
		var record attendeeRecord
		require.NoError(t, attendeeRows.Scan(&record.userID, &record.priceID, &record.priceGroupID, &record.amountMinor, &record.currencyCode))
		records = append(records, record)
	}
	require.NoError(t, attendeeRows.Err())
	require.Len(t, records, 2)
	require.Contains(t, []int64{userIDs["auth-buyer@example.com"], userIDs["auth-guest@example.com"]}, records[0].userID)
	require.Contains(t, []int64{userIDs["auth-buyer@example.com"], userIDs["auth-guest@example.com"]}, records[1].userID)
	require.Equal(t, int64(2500), records[0].amountMinor)
	require.Equal(t, int64(2500), records[1].amountMinor)
	require.Equal(t, "EUR", records[0].currencyCode)
	require.Equal(t, "EUR", records[1].currencyCode)
	require.Equal(t, priceGroups[0].Prices[0].ID, fmt.Sprintf("%d", records[0].priceID))
	require.Equal(t, priceGroups[0].Prices[0].ID, fmt.Sprintf("%d", records[1].priceID))
	require.Equal(t, priceGroups[0].ID, fmt.Sprintf("%d", records[0].priceGroupID))
	require.Equal(t, priceGroups[0].ID, fmt.Sprintf("%d", records[1].priceGroupID))

	holdRow := sqlDB.QueryRow("SELECT quantity, expires_at, price_group_id FROM ticket_holds WHERE order_id = ?", resp.Msg.OrderId)
	var quantity int64
	var expiresAt int64
	var holdPriceGroupID int64
	require.NoError(t, holdRow.Scan(&quantity, &expiresAt, &holdPriceGroupID))
	require.Equal(t, int64(2), quantity)
	require.Equal(t, priceGroups[0].ID, fmt.Sprintf("%d", holdPriceGroupID))
	holdTTL := testPaymentProviders("sk_test_123")[zeni.PaymentPlatformStripeConnect].DefaultHoldTTL()
	minExpected := startTimestamp + int64((holdTTL + ticketHoldExpiryBuffer).Seconds())
	maxExpected := endTimestamp + int64((holdTTL + ticketHoldExpiryBuffer).Seconds())
	require.GreaterOrEqual(t, expiresAt, minExpected)
	require.LessOrEqual(t, expiresAt, maxExpected)
}

func TestStartTicketPaymentRollsBackOnStripeFailure(t *testing.T) {
	db, sqlDB := ztesting.SetupTestDB(t)
	organizerAuth := &ticketPaymentStubAuth{}
	organizerAuth.user = organizerAuth.ensureAuthUser("org@example.com")
	organizerServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             organizerAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	organizer, err := db.CreateUser(organizerAuth.user.ID)
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		organizer.ID,
		[]string{organizer.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{DisplayName: "Test community"},
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

	createResp, err := organizerServer.CreateEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.CreateEventRequest{
			Title:       "Paid event",
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
			CommunityId:  community.ID,
			Discoverable: true,
			PricesGroups: []*zenaov1.EventPriceGroup{
				{
					Prices: []*zenaov1.EventPrice{{
						AmountMinor:  2500,
						CurrencyCode: "EUR",
					}},
				},
			},
		}),
	)
	require.NoError(t, err)

	priceGroups, err := db.GetPriceGroupsByEvent(createResp.Msg.Id)
	require.NoError(t, err)
	priceID := priceGroups[0].Prices[0].ID

	originalStripeNew := zpstripe.CheckoutSessionNew
	zpstripe.CheckoutSessionNew = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
		requireStripeAccountParam(t, params, "acct_123")
		return nil, errors.New("stripe unavailable")
	}
	t.Cleanup(func() { zpstripe.CheckoutSessionNew = originalStripeNew })

	checkoutAuth := &ticketPaymentStubAuth{}
	checkoutAuth.user = checkoutAuth.ensureAuthUser("rollback-actor@example.com")
	_, err = db.CreateUser(checkoutAuth.user.ID)
	require.NoError(t, err)
	checkoutServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	_, err = checkoutServer.StartTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.StartTicketPaymentRequest{
			EventId: createResp.Msg.Id,
			LineItems: []*zenaov1.StartTicketPaymentLineItem{
				{
					PriceId:       priceID,
					AttendeeEmail: "buyer@example.com",
				},
			},
			Password:    "",
			SuccessPath: fmt.Sprintf("/event/%s", createResp.Msg.Id),
			CancelPath:  fmt.Sprintf("/event/%s", createResp.Msg.Id),
		}),
	)
	require.Error(t, err)

	row := sqlDB.QueryRow("SELECT status FROM orders ORDER BY id DESC LIMIT 1")
	var status string
	require.NoError(t, row.Scan(&status))
	require.Equal(t, string(zeni.OrderStatusFailed), status)

	countRow := sqlDB.QueryRow("SELECT COUNT(1) FROM ticket_holds")
	var holdCount int
	require.NoError(t, countRow.Scan(&holdCount))
	require.Equal(t, 0, holdCount)
}

func TestStartTicketPaymentRemovesExpiredHolds(t *testing.T) {
	db, sqlDB := ztesting.SetupTestDB(t)
	organizerAuth := &ticketPaymentStubAuth{}
	organizerAuth.user = organizerAuth.ensureAuthUser("org@example.com")
	organizerServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             organizerAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	organizer, err := db.CreateUser(organizerAuth.user.ID)
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		organizer.ID,
		[]string{organizer.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{DisplayName: "Test community"},
	)
	require.NoError(t, err)

	now := time.Now().UTC()
	paymentAccount, err := db.UpsertPaymentAccount(&zeni.PaymentAccount{
		CommunityID:       community.ID,
		PlatformType:      zeni.PaymentPlatformStripeConnect,
		PlatformAccountID: "acct_123",
		OnboardingState:   zeni.PaymentOnboardingStateCompleted,
		StartedAt:         now,
		VerificationState: zeni.PaymentVerificationStateVerified,
		LastVerifiedAt:    &now,
	})
	require.NoError(t, err)

	createResp, err := organizerServer.CreateEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.CreateEventRequest{
			Title:       "Paid event",
			Description: "test description",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    10,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
			CommunityId:  community.ID,
			Discoverable: true,
			PricesGroups: []*zenaov1.EventPriceGroup{
				{
					Prices: []*zenaov1.EventPrice{{
						AmountMinor:  2500,
						CurrencyCode: "EUR",
					}},
				},
			},
		}),
	)
	require.NoError(t, err)

	priceGroups, err := db.GetPriceGroupsByEvent(createResp.Msg.Id)
	require.NoError(t, err)
	priceID := priceGroups[0].Prices[0].ID
	priceGroupID := priceGroups[0].ID

	expiredOrder, err := db.CreateOrder(&zeni.Order{
		CreatedAt:        time.Now().Add(-2 * time.Hour).Unix(),
		EventID:          createResp.Msg.Id,
		BuyerID:          organizer.ID,
		CurrencyCode:     "EUR",
		AmountMinor:      2500,
		PaymentAccountID: paymentAccount.ID,
		Status:           zeni.OrderStatusPending,
	}, nil)
	require.NoError(t, err)

	_, err = db.CreateTicketHold(&zeni.TicketHold{
		CreatedAt:    time.Now().Add(-2 * time.Hour).Unix(),
		EventID:      createResp.Msg.Id,
		PriceGroupID: priceGroupID,
		OrderID:      expiredOrder.ID,
		Quantity:     1,
		ExpiresAt:    time.Now().Add(-time.Minute).Unix(),
	})
	require.NoError(t, err)

	originalStripeNew := zpstripe.CheckoutSessionNew
	zpstripe.CheckoutSessionNew = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
		requireStripeAccountParam(t, params, "acct_123")
		return &stripe.CheckoutSession{ID: "cs_test_123", URL: "https://checkout.test"}, nil
	}
	t.Cleanup(func() { zpstripe.CheckoutSessionNew = originalStripeNew })

	checkoutAuth := &ticketPaymentStubAuth{}
	checkoutServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	_, err = checkoutServer.StartTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.StartTicketPaymentRequest{
			EventId: createResp.Msg.Id,
			LineItems: []*zenaov1.StartTicketPaymentLineItem{
				{
					PriceId:       priceID,
					AttendeeEmail: "buyer@example.com",
				},
			},
			SuccessPath: fmt.Sprintf("/event/%s", createResp.Msg.Id),
			CancelPath:  fmt.Sprintf("/event/%s", createResp.Msg.Id),
		}),
	)
	require.NoError(t, err)

	countRow := sqlDB.QueryRow("SELECT COUNT(1) FROM ticket_holds WHERE order_id = ?", expiredOrder.ID)
	var holdCount int
	require.NoError(t, countRow.Scan(&holdCount))
	require.Equal(t, 0, holdCount)
}

func TestStartTicketPaymentRejectsWhenSoldOut(t *testing.T) {
	db, sqlDB := ztesting.SetupTestDB(t)
	organizerAuth := &ticketPaymentStubAuth{}
	organizerAuth.user = organizerAuth.ensureAuthUser("org@example.com")
	organizerServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             organizerAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	organizer, err := db.CreateUser(organizerAuth.user.ID)
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		organizer.ID,
		[]string{organizer.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{DisplayName: "Test community"},
	)
	require.NoError(t, err)

	now := time.Now().UTC()
	paymentAccount, err := db.UpsertPaymentAccount(&zeni.PaymentAccount{
		CommunityID:       community.ID,
		PlatformType:      zeni.PaymentPlatformStripeConnect,
		PlatformAccountID: "acct_123",
		OnboardingState:   zeni.PaymentOnboardingStateCompleted,
		StartedAt:         now,
		VerificationState: zeni.PaymentVerificationStateVerified,
		LastVerifiedAt:    &now,
	})
	require.NoError(t, err)

	createResp, err := organizerServer.CreateEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.CreateEventRequest{
			Title:       "Paid event",
			Description: "test description",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    1,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
			CommunityId:  community.ID,
			Discoverable: true,
			PricesGroups: []*zenaov1.EventPriceGroup{
				{
					Prices: []*zenaov1.EventPrice{{
						AmountMinor:  2500,
						CurrencyCode: "EUR",
					}},
				},
			},
		}),
	)
	require.NoError(t, err)

	priceGroups, err := db.GetPriceGroupsByEvent(createResp.Msg.Id)
	require.NoError(t, err)
	priceID := priceGroups[0].Prices[0].ID
	priceGroupID := priceGroups[0].ID

	existingOrder, err := db.CreateOrder(&zeni.Order{
		CreatedAt:        time.Now().Unix(),
		EventID:          createResp.Msg.Id,
		BuyerID:          organizer.ID,
		CurrencyCode:     "EUR",
		AmountMinor:      2500,
		Status:           zeni.OrderStatusPending,
		PaymentAccountID: paymentAccount.ID,
	}, nil)
	require.NoError(t, err)

	_, err = db.CreateTicketHold(&zeni.TicketHold{
		CreatedAt:    time.Now().Unix(),
		EventID:      createResp.Msg.Id,
		PriceGroupID: priceGroupID,
		OrderID:      existingOrder.ID,
		Quantity:     1,
		ExpiresAt:    time.Now().Add(time.Minute).Unix(),
	})
	require.NoError(t, err)

	checkoutAuth := &ticketPaymentStubAuth{}
	checkoutAuth.user = checkoutAuth.ensureAuthUser("soldout-actor@example.com")
	_, err = db.CreateUser(checkoutAuth.user.ID)
	require.NoError(t, err)
	checkoutServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	_, err = checkoutServer.StartTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.StartTicketPaymentRequest{
			EventId: createResp.Msg.Id,
			LineItems: []*zenaov1.StartTicketPaymentLineItem{
				{
					PriceId:       priceID,
					AttendeeEmail: "buyer@example.com",
				},
			},
			SuccessPath: fmt.Sprintf("/event/%s", createResp.Msg.Id),
			CancelPath:  fmt.Sprintf("/event/%s", createResp.Msg.Id),
		}),
	)
	require.Error(t, err)

	countRow := sqlDB.QueryRow("SELECT COUNT(1) FROM orders")
	var orderCount int
	require.NoError(t, countRow.Scan(&orderCount))
	require.Equal(t, 1, orderCount)
}

func TestStartTicketPaymentRejectsFreeEvent(t *testing.T) {
	db, sqlDB := ztesting.SetupTestDB(t)
	organizerAuth := &ticketPaymentStubAuth{}
	organizerAuth.user = organizerAuth.ensureAuthUser("org@example.com")
	organizerServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             organizerAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	organizer, err := db.CreateUser(organizerAuth.user.ID)
	require.NoError(t, err)

	createResp, err := organizerServer.CreateEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.CreateEventRequest{
			Title:       "Free event",
			Description: "test description",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    10,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
			Discoverable: true,
			Organizers:   []string{organizer.ID},
			PricesGroups: []*zenaov1.EventPriceGroup{
				{
					Prices: []*zenaov1.EventPrice{{
						AmountMinor:  0,
						CurrencyCode: "",
					}},
				},
			},
		}),
	)
	require.NoError(t, err)

	priceGroups, err := db.GetPriceGroupsByEvent(createResp.Msg.Id)
	require.NoError(t, err)
	priceID := priceGroups[0].Prices[0].ID

	checkoutAuth := &ticketPaymentStubAuth{}
	checkoutAuth.user = checkoutAuth.ensureAuthUser("free-event-actor@example.com")
	_, err = db.CreateUser(checkoutAuth.user.ID)
	require.NoError(t, err)
	checkoutServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	_, err = checkoutServer.StartTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.StartTicketPaymentRequest{
			EventId: createResp.Msg.Id,
			LineItems: []*zenaov1.StartTicketPaymentLineItem{
				{
					PriceId:       priceID,
					AttendeeEmail: "buyer@example.com",
				},
			},
			SuccessPath: fmt.Sprintf("/event/%s", createResp.Msg.Id),
			CancelPath:  fmt.Sprintf("/event/%s", createResp.Msg.Id),
		}),
	)
	require.Error(t, err)

	countRow := sqlDB.QueryRow("SELECT COUNT(1) FROM orders")
	var orderCount int
	require.NoError(t, countRow.Scan(&orderCount))
	require.Equal(t, 0, orderCount)
}

func TestStartTicketPaymentRequiresPriceSelectionForMultiplePrices(t *testing.T) {
	db, _ := ztesting.SetupTestDB(t)
	organizerAuth := &ticketPaymentStubAuth{}
	organizerAuth.user = organizerAuth.ensureAuthUser("org@example.com")
	organizerServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             organizerAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	organizer, err := db.CreateUser(organizerAuth.user.ID)
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		organizer.ID,
		[]string{organizer.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{DisplayName: "Test community"},
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

	createResp, err := organizerServer.CreateEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.CreateEventRequest{
			Title:       "Paid event",
			Description: "test description",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    10,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
			CommunityId:  community.ID,
			Discoverable: true,
			PricesGroups: []*zenaov1.EventPriceGroup{
				{
					Prices: []*zenaov1.EventPrice{{
						AmountMinor:  2500,
						CurrencyCode: "EUR",
					}},
				},
				{
					Prices: []*zenaov1.EventPrice{{
						AmountMinor:  2600,
						CurrencyCode: "USD",
					}},
				},
			},
		}),
	)
	require.NoError(t, err)

	checkoutAuth := &ticketPaymentStubAuth{}
	checkoutAuth.user = checkoutAuth.ensureAuthUser("multi-price-actor@example.com")
	_, err = db.CreateUser(checkoutAuth.user.ID)
	require.NoError(t, err)
	checkoutServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	_, err = checkoutServer.StartTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.StartTicketPaymentRequest{
			EventId: createResp.Msg.Id,
			LineItems: []*zenaov1.StartTicketPaymentLineItem{
				{
					AttendeeEmail: "buyer@example.com",
				},
			},
			SuccessPath: fmt.Sprintf("/event/%s", createResp.Msg.Id),
			CancelPath:  fmt.Sprintf("/event/%s", createResp.Msg.Id),
		}),
	)
	require.Error(t, err)
}

func TestStartTicketPaymentUsesFirstEmailForBuyerWhenLoggedOut(t *testing.T) {
	db, sqlDB := ztesting.SetupTestDB(t)
	organizerAuth := &ticketPaymentStubAuth{}
	organizerAuth.user = organizerAuth.ensureAuthUser("org@example.com")
	organizerServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             organizerAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	organizer, err := db.CreateUser(organizerAuth.user.ID)
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		organizer.ID,
		[]string{organizer.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{DisplayName: "Test community"},
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

	createResp, err := organizerServer.CreateEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.CreateEventRequest{
			Title:       "Paid event",
			Description: "test description",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    2,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
			CommunityId:  community.ID,
			Discoverable: true,
			PricesGroups: []*zenaov1.EventPriceGroup{
				{
					Prices: []*zenaov1.EventPrice{{
						AmountMinor:  2500,
						CurrencyCode: "EUR",
					}},
				},
			},
		}),
	)
	require.NoError(t, err)

	priceGroups, err := db.GetPriceGroupsByEvent(createResp.Msg.Id)
	require.NoError(t, err)
	priceID := priceGroups[0].Prices[0].ID

	originalStripeNew := zpstripe.CheckoutSessionNew
	zpstripe.CheckoutSessionNew = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
		requireStripeAccountParam(t, params, "acct_123")
		return &stripe.CheckoutSession{ID: "cs_test_123", URL: "https://checkout.test"}, nil
	}
	t.Cleanup(func() { zpstripe.CheckoutSessionNew = originalStripeNew })

	checkoutAuth := &ticketPaymentStubAuth{}
	checkoutServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	_, err = checkoutServer.StartTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.StartTicketPaymentRequest{
			EventId: createResp.Msg.Id,
			LineItems: []*zenaov1.StartTicketPaymentLineItem{
				{
					PriceId:       priceID,
					AttendeeEmail: "first@example.com",
				},
				{
					PriceId:       priceID,
					AttendeeEmail: "second@example.com",
				},
			},
			SuccessPath: fmt.Sprintf("/event/%s", createResp.Msg.Id),
			CancelPath:  fmt.Sprintf("/event/%s", createResp.Msg.Id),
		}),
	)
	require.NoError(t, err)

	var buyerID int64
	row := sqlDB.QueryRow("SELECT buyer_id FROM orders ORDER BY id DESC LIMIT 1")
	require.NoError(t, row.Scan(&buyerID))

	var expectedBuyerID int64
	userRow := sqlDB.QueryRow("SELECT id FROM users WHERE auth_id = ?", "auth-first@example.com")
	require.NoError(t, userRow.Scan(&expectedBuyerID))

	require.Equal(t, expectedBuyerID, buyerID)
}
