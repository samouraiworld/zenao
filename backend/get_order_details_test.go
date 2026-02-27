package main

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/payment/zpstripe"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/stretchr/testify/require"
	"github.com/stripe/stripe-go/v84"
	"go.uber.org/zap"
)

func TestGetOrderDetailsBuyerAccess(t *testing.T) {
	db, _, orderID, sessionID, checkoutAuth := setupPaymentConfirmationFixtureWithAttendees(
		t,
		[]string{"buyer@example.com", "guest@example.com"},
	)

	originalStripeGet := zpstripe.CheckoutSessionGet
	zpstripe.CheckoutSessionGet = func(id string, params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
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

	resp, err := server.GetOrderDetails(
		context.Background(),
		connect.NewRequest(&zenaov1.GetOrderDetailsRequest{OrderId: orderID}),
	)
	require.NoError(t, err)
	require.NotNil(t, resp.Msg.Order)
	require.Equal(t, orderID, resp.Msg.Order.OrderId)
	require.Len(t, resp.Msg.Tickets, 2)
}

func TestGetOrderDetailsRejectsNonBuyer(t *testing.T) {
	db, _, orderID, sessionID, checkoutAuth := setupPaymentConfirmationFixtureWithAttendees(
		t,
		[]string{"buyer@example.com"},
	)

	originalStripeGet := zpstripe.CheckoutSessionGet
	zpstripe.CheckoutSessionGet = func(id string, params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
		return &stripe.CheckoutSession{
			PaymentStatus: stripe.CheckoutSessionPaymentStatusPaid,
			PaymentIntent: &stripe.PaymentIntent{ID: "pi_test_456"},
		}, nil
	}
	t.Cleanup(func() { zpstripe.CheckoutSessionGet = originalStripeGet })

	buyerServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             checkoutAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	_, err := buyerServer.ConfirmTicketPayment(
		context.Background(),
		connect.NewRequest(&zenaov1.ConfirmTicketPaymentRequest{
			OrderId:           orderID,
			CheckoutSessionId: sessionID,
		}),
	)
	require.NoError(t, err)

	intruderAuth := &ticketPaymentStubAuth{}
	intruderAuth.user = intruderAuth.ensureAuthUser("intruder@example.com")
	_, err = db.CreateUser(intruderAuth.user.ID)
	require.NoError(t, err)

	intruderServer := &ZenaoServer{
		Logger:           zap.NewNop(),
		Auth:             intruderAuth,
		DB:               db,
		AppBaseURL:       "https://zenao.test",
		StripeSecretKey:  "sk_test_123",
		PaymentProviders: testPaymentProviders("sk_test_123"),
	}

	_, err = intruderServer.GetOrderDetails(
		context.Background(),
		connect.NewRequest(&zenaov1.GetOrderDetailsRequest{OrderId: orderID}),
	)
	require.Error(t, err)
}
