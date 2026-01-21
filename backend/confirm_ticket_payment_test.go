package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/payment"
	"github.com/samouraiworld/zenao/backend/payment/zpstripe"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/samouraiworld/zenao/backend/ztesting"
	"github.com/stretchr/testify/require"
	"github.com/stripe/stripe-go/v84"
	"go.uber.org/zap"
)

func setupPaymentConfirmationFixture(t *testing.T) (zeni.DB, *sql.DB, string, string, *ticketPaymentStubAuth) {
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

	resp, err := checkoutServer.StartTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.StartTicketPaymentRequest{
			EventId: createResp.Msg.Id,
			LineItems: []*zenaov1.StartTicketPaymentLineItem{
				{
					PriceId:       priceID,
					AttendeeEmail: "buyer@example.com",
				},
			},
			SuccessPath: "/events/paid-event",
			CancelPath:  "/events/paid-event",
		}),
	)
	require.NoError(t, err)

	orderID := resp.Msg.OrderId
	row := sqlDB.QueryRow("SELECT payment_session_id FROM orders WHERE id = ?", orderID)
	var sessionID sql.NullString
	require.NoError(t, row.Scan(&sessionID))
	require.True(t, sessionID.Valid)

	buyerRow := sqlDB.QueryRow("SELECT buyer_id FROM orders WHERE id = ?", orderID)
	var buyerID int64
	require.NoError(t, buyerRow.Scan(&buyerID))
	users, err := db.GetUsersByIDs([]string{fmt.Sprintf("%d", buyerID)})
	require.NoError(t, err)
	require.NotEmpty(t, users)
	authUsers, err := checkoutAuth.GetUsersFromIDs(context.Background(), []string{users[0].AuthID})
	require.NoError(t, err)
	require.NotEmpty(t, authUsers)
	require.NotEmpty(t, authUsers[0].Email)

	account, err := db.GetOrderPaymentAccount(orderID)
	require.NoError(t, err)
	require.NotNil(t, account)
	require.Equal(t, "acct_123", account.PlatformAccountID)

	return db, sqlDB, orderID, sessionID.String, checkoutAuth
}

func newTestResendClient(t *testing.T) (*resend.Client, *int) {
	count := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count++
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"email_123"}`))
	}))
	t.Cleanup(srv.Close)

	client := resend.NewCustomClient(srv.Client(), "test-key")
	baseURL, err := url.Parse(srv.URL + "/")
	require.NoError(t, err)
	client.BaseURL = baseURL

	return client, &count
}

func TestConfirmTicketPaymentSuccessUpdatesOrderAndSendsEmailOnce(t *testing.T) {
	db, sqlDB, orderID, sessionID, checkoutAuth := setupPaymentConfirmationFixture(t)
	mailClient, sendCount := newTestResendClient(t)

	originalStripeGet := zpstripe.CheckoutSessionGet
	zpstripe.CheckoutSessionGet = func(id string, params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
		require.Equal(t, sessionID, id)
		require.NotNil(t, params)
		require.NotNil(t, params.StripeAccount)
		require.Equal(t, "acct_123", *params.StripeAccount)
		return &stripe.CheckoutSession{
			PaymentStatus: stripe.CheckoutSessionPaymentStatusPaid,
			PaymentIntent: &stripe.PaymentIntent{ID: "pi_test_123"},
		}, nil
	}
	t.Cleanup(func() { zpstripe.CheckoutSessionGet = originalStripeGet })

	server := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		MailClient:       mailClient,
		MailSender:       "contact@mail.zenao.io",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: map[string]payment.Payment{zeni.PaymentPlatformStripeConnect: zpstripe.NewStripe("sk_test_123")},
	}

	resp, err := server.ConfirmTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.ConfirmTicketPaymentRequest{
			OrderId:           orderID,
			CheckoutSessionId: sessionID,
		}),
	)
	require.NoError(t, err)
	require.Equal(t, string(zeni.OrderStatusSuccess), resp.Msg.Status)
	require.Equal(t, "pi_test_123", resp.Msg.ReceiptReference)

	row := sqlDB.QueryRow("SELECT status, payment_intent_id, confirmed_at FROM orders WHERE id = ?", orderID)
	var status string
	var intent sql.NullString
	var confirmed sql.NullInt64
	require.NoError(t, row.Scan(&status, &intent, &confirmed))
	require.Equal(t, string(zeni.OrderStatusSuccess), status)
	require.Equal(t, "pi_test_123", intent.String)
	require.True(t, confirmed.Valid)
	require.Equal(t, 1, *sendCount)

	_, err = server.ConfirmTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.ConfirmTicketPaymentRequest{
			OrderId:           orderID,
			CheckoutSessionId: sessionID,
		}),
	)
	require.NoError(t, err)
	require.Equal(t, 1, *sendCount)
}

func TestConfirmTicketPaymentPendingSkipsEmail(t *testing.T) {
	db, sqlDB, orderID, sessionID, checkoutAuth := setupPaymentConfirmationFixture(t)
	mailClient, sendCount := newTestResendClient(t)

	originalStripeGet := zpstripe.CheckoutSessionGet
	zpstripe.CheckoutSessionGet = func(id string, params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
		require.Equal(t, sessionID, id)
		require.NotNil(t, params)
		require.NotNil(t, params.StripeAccount)
		require.Equal(t, "acct_123", *params.StripeAccount)
		return &stripe.CheckoutSession{PaymentStatus: stripe.CheckoutSessionPaymentStatusUnpaid}, nil
	}
	t.Cleanup(func() { zpstripe.CheckoutSessionGet = originalStripeGet })

	server := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		MailClient:       mailClient,
		MailSender:       "contact@mail.zenao.io",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: map[string]payment.Payment{zeni.PaymentPlatformStripeConnect: zpstripe.NewStripe("sk_test_123")},
	}

	resp, err := server.ConfirmTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.ConfirmTicketPaymentRequest{
			OrderId:           orderID,
			CheckoutSessionId: sessionID,
		}),
	)
	require.NoError(t, err)
	require.Equal(t, string(zeni.OrderStatusPending), resp.Msg.Status)
	require.Empty(t, resp.Msg.ReceiptReference)

	row := sqlDB.QueryRow("SELECT status, confirmed_at FROM orders WHERE id = ?", orderID)
	var status string
	var confirmed sql.NullInt64
	require.NoError(t, row.Scan(&status, &confirmed))
	require.Equal(t, string(zeni.OrderStatusPending), status)
	require.False(t, confirmed.Valid)
	require.Equal(t, 0, *sendCount)
}

func TestConfirmTicketPaymentStripeErrorDoesNotUpdateOrder(t *testing.T) {
	db, sqlDB, orderID, sessionID, checkoutAuth := setupPaymentConfirmationFixture(t)

	originalStripeGet := zpstripe.CheckoutSessionGet
	zpstripe.CheckoutSessionGet = func(id string, params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
		require.Equal(t, sessionID, id)
		return nil, errTestStripeFailure
	}
	t.Cleanup(func() { zpstripe.CheckoutSessionGet = originalStripeGet })

	server := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: map[string]payment.Payment{zeni.PaymentPlatformStripeConnect: zpstripe.NewStripe("sk_test_123")},
	}

	_, err := server.ConfirmTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.ConfirmTicketPaymentRequest{
			OrderId:           orderID,
			CheckoutSessionId: sessionID,
		}),
	)
	require.Error(t, err)

	row := sqlDB.QueryRow("SELECT status, confirmed_at FROM orders WHERE id = ?", orderID)
	var status string
	var confirmed sql.NullInt64
	require.NoError(t, row.Scan(&status, &confirmed))
	require.Equal(t, string(zeni.OrderStatusPending), status)
	require.False(t, confirmed.Valid)
}

var errTestStripeFailure = &testStripeFailure{}

type testStripeFailure struct{}

func (e *testStripeFailure) Error() string {
	return "stripe unavailable"
}
