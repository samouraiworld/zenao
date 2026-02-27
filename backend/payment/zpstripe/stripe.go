package zpstripe

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/samouraiworld/zenao/backend/payment"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/stripe/stripe-go/v84"
	checkoutsession "github.com/stripe/stripe-go/v84/checkout/session"
)

type Stripe struct{}

func NewStripe(stripeSecretKey string) *Stripe {
	stripe.Key = stripeSecretKey

	return &Stripe{}
}

func (s *Stripe) DefaultHoldTTL() time.Duration {
	return 30 * time.Minute
}

func (s *Stripe) PlatformType() string {
	return zeni.PaymentPlatformStripeConnect
}

func (s *Stripe) CreateCheckoutSession(ctx context.Context, input payment.CheckoutSessionInput) (*payment.CheckoutSession, error) {
	_ = ctx
	params := s.buildCheckoutSessionParams(input)
	params.AddMetadata("order_id", input.OrderID)
	params.PaymentIntentData.AddMetadata("order_id", input.OrderID)
	params.SetIdempotencyKey(fmt.Sprintf("checkout-session.order.%s", input.OrderID))
	params.SetStripeAccount(input.ProviderAccountID)

	session, err := CheckoutSessionNew(params)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, errors.New("stripe session is nil")
	}
	return &payment.CheckoutSession{
		ID:  session.ID,
		URL: session.URL,
	}, nil
}

func mapStripePaymentStatus(status stripe.CheckoutSessionPaymentStatus) (payment.PaymentStatus, error) {
	switch status {
	case stripe.CheckoutSessionPaymentStatusPaid:
		return payment.PaymentStatusPaid, nil
	case stripe.CheckoutSessionPaymentStatusUnpaid:
		return payment.PaymentStatusUnpaid, nil
	case stripe.CheckoutSessionPaymentStatusNoPaymentRequired:
		return payment.PaymentStatusNoPaymentRequired, nil
	}

	return payment.PaymentStatusUnknown, fmt.Errorf("unknown stripe payment status: %s", status)
}

func (s *Stripe) GetCheckoutSession(ctx context.Context, sessionID string, accountID string) (*payment.CheckoutSessionStatus, error) {
	_ = ctx
	if strings.TrimSpace(sessionID) == "" {
		return nil, errors.New("checkout session id is required")
	}

	params := &stripe.CheckoutSessionParams{}
	if strings.TrimSpace(accountID) != "" {
		params.SetStripeAccount(accountID)
	}

	session, err := CheckoutSessionGet(sessionID, params)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, errors.New("stripe session is nil")
	}

	intentID := ""
	if session.PaymentIntent != nil {
		intentID = session.PaymentIntent.ID
	}

	paymentStatus, err := mapStripePaymentStatus(session.PaymentStatus)
	if err != nil {
		return nil, err
	}

	return &payment.CheckoutSessionStatus{
		PaymentStatus:   paymentStatus,
		PaymentIntentID: intentID,
	}, nil
}

func (s *Stripe) CheckPaymentStatus(orderID string) (zeni.OrderStatus, error) {
	if strings.TrimSpace(orderID) == "" {
		return "", errors.New("order id is required")
	}
	return zeni.OrderStatusPending, errors.New("check payment status not implemented")
}

func (s *Stripe) buildCheckoutSessionParams(input payment.CheckoutSessionInput) *stripe.CheckoutSessionParams {
	currency := strings.ToLower(strings.TrimSpace(input.Currency))
	checkoutLineItems := make([]*stripe.CheckoutSessionLineItemParams, 0, len(input.LineItems))
	for _, item := range input.LineItems {
		checkoutLineItems = append(checkoutLineItems, &stripe.CheckoutSessionLineItemParams{
			Quantity: stripe.Int64(int64(item.Quantity)),
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency:   stripe.String(currency),
				UnitAmount: stripe.Int64(item.AmountMinor),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String(fmt.Sprintf("Ticket: %s", input.EventTitle)),
				},
			},
		})
	}
	return &stripe.CheckoutSessionParams{
		Mode:              stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:        stripe.String(input.SuccessURL),
		CancelURL:         stripe.String(input.CancelURL),
		ClientReferenceID: stripe.String(input.OrderID),
		CustomerEmail:     stripe.String(input.CustomerEmail),
		ExpiresAt:         stripe.Int64(input.Now + int64(s.DefaultHoldTTL().Seconds())),
		PaymentIntentData: &stripe.CheckoutSessionPaymentIntentDataParams{},
		LineItems:         checkoutLineItems,
	}
}

var CheckoutSessionNew = checkoutsession.New
var CheckoutSessionGet = checkoutsession.Get
var _ payment.Payment = (*Stripe)(nil)
