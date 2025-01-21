package main

import (
	"context"
	"errors"
	"fmt"
	"math"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/account"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"go.uber.org/zap"
)

// CreateCheckoutSession implements zenaov1connect.ZenaoServiceHandler.
func (s *ZenaoServer) CreateCheckoutSession(ctx context.Context, req *connect.Request[zenaov1.CreateCheckoutSessionRequest]) (*connect.Response[zenaov1.CreateCheckoutSessionResponse], error) {
	s.Logger.Info("create-checkout-session", zap.String("event-id", req.Msg.EventId))

	checkoutURI := ""

	// XXX: check remaining tickets

	// XXX: create product on event creation (and edit product on edit event)

	if err := s.DB.Tx(func(db ZenaoDB) error {
		evt, err := db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}

		var bizAcc *stripe.Account
		creatorBusinessAccounts, err := db.GetBusinessAccounts(evt.CreatorID)
		if err != nil {
			return err
		}
		for _, acc := range creatorBusinessAccounts {
			stripeAcc, err := account.GetByID(acc.StripeAccountID, nil)
			if err != nil {
				continue
			}
			if stripeAcc.ChargesEnabled {
				bizAcc = stripeAcc
				break
			}
		}
		if bizAcc == nil {
			return errors.New("no suitable business account for event creator")
		}

		unitAmt := int64(math.Ceil(evt.TicketPrice * 100))
		qtty := int64(req.Msg.NumTickets)
		totalAmt := unitAmt * qtty

		params := &stripe.CheckoutSessionParams{
			LineItems: []*stripe.CheckoutSessionLineItemParams{{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("EUR"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Images: stripe.StringSlice([]string{evt.ImageURI}),
						Name:   stripe.String(fmt.Sprintf("Ticket for %s", evt.Title)),
						// XXX: TaxCode ??
					},
					UnitAmount: stripe.Int64(unitAmt),
				},
				Quantity: stripe.Int64(qtty),
			}},
			Mode:          stripe.String(string(stripe.CheckoutSessionModePayment)),
			SuccessURL:    stripe.String(frontendDomain + "?success=true"),
			CancelURL:     stripe.String(frontendDomain + "?canceled=true"),
			AutomaticTax:  &stripe.CheckoutSessionAutomaticTaxParams{Enabled: stripe.Bool(true)},
			CustomerEmail: &req.Msg.Email,
			PaymentIntentData: &stripe.CheckoutSessionPaymentIntentDataParams{
				ApplicationFeeAmount: stripe.Int64(int64(math.Floor(float64(totalAmt) * 0.05))), // XXX: deduct stripe fee??
			},
		}
		params.SetStripeAccount(bizAcc.ID)

		sess, err := session.New(params)
		if err != nil {
			return err
		}

		checkoutURI = sess.URL

		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreateCheckoutSessionResponse{
		CheckoutUri: checkoutURI,
	}), nil
}
