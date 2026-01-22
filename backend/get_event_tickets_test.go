package main

import (
	"context"
	"database/sql"
	"fmt"
	"testing"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/payment/zpstripe"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/stretchr/testify/require"
	"github.com/stripe/stripe-go/v84"
	"go.uber.org/zap"
)

func TestGetEventTicketsAccess(t *testing.T) {
	db, sqlDB, orderID, sessionID, checkoutAuth := setupPaymentConfirmationFixtureWithAttendees(
		t,
		[]string{"buyer@example.com", "guest@example.com"},
	)

	eventID := fetchEventIDForOrder(t, sqlDB, orderID)

	originalStripeGet := zpstripe.CheckoutSessionGet
	zpstripe.CheckoutSessionGet = func(id string, params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
		return &stripe.CheckoutSession{
			PaymentStatus: stripe.CheckoutSessionPaymentStatusPaid,
			PaymentIntent: &stripe.PaymentIntent{ID: "pi_test_789"},
		}, nil
	}
	t.Cleanup(func() { zpstripe.CheckoutSessionGet = originalStripeGet })

	server := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	_, err := server.ConfirmTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.ConfirmTicketPaymentRequest{
			OrderId:           orderID,
			CheckoutSessionId: sessionID,
		}),
	)
	require.NoError(t, err)

	buyerResp, err := server.GetEventTickets(
		context.Background(),
		connect.NewRequest(&zenaov1.GetEventTicketsRequest{EventId: eventID}),
	)
	require.NoError(t, err)
	require.Len(t, buyerResp.Msg.TicketsInfo, 2)

	guestAuth := &ticketPaymentStubAuth{
		user:      checkoutAuth.knownAuth["guest@example.com"],
		knownAuth: checkoutAuth.knownAuth,
	}

	guestServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             guestAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	guestResp, err := guestServer.GetEventTickets(
		context.Background(),
		connect.NewRequest(&zenaov1.GetEventTicketsRequest{EventId: eventID}),
	)
	require.NoError(t, err)
	require.Len(t, guestResp.Msg.TicketsInfo, 1)
}

func fetchEventIDForOrder(t *testing.T, sqlDB *sql.DB, orderID string) string {
	t.Helper()

	row := sqlDB.QueryRow("SELECT event_id FROM orders WHERE id = ?", orderID)
	var eventID int64
	require.NoError(t, row.Scan(&eventID))
	return fmt.Sprint(eventID)
}
