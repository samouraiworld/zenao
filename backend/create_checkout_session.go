package main

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"go.uber.org/zap"
)

// CreateCheckoutSession implements zenaov1connect.ZenaoServiceHandler.
func (s *ZenaoServer) CreateCheckoutSession(ctx context.Context, req *connect.Request[zenaov1.CreateCheckoutSessionRequest]) (*connect.Response[zenaov1.CreateCheckoutSessionResponse], error) {
	user := s.GetUser(ctx)

	s.Logger.Info("create-checkout-session", zap.String("event-id", req.Msg.EventId), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	checkoutURI := ""

	// XXX: check remaining tickets

	if err := s.DBTx(func(db ZenaoDB) error {
		evt, err := db.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}

		params := &stripe.CheckoutSessionParams{
			ClientReferenceID: &user.ID,
			LineItems: []*stripe.CheckoutSessionLineItemParams{{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("EUR"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Images: stripe.StringSlice([]string{evt.ImageURI}),
						Name:   stripe.String(fmt.Sprintf("Ticket for %s", evt.Title)),
						// XXX: TaxCode ??
					},
					UnitAmountDecimal: stripe.Float64(evt.TicketPrice),
				},
				Quantity: stripe.Int64(int64(req.Msg.NumTickets)),
			}},
			Mode:         stripe.String(string(stripe.CheckoutSessionModePayment)),
			SuccessURL:   stripe.String(frontendDomain + "?success=true"),
			CancelURL:    stripe.String(frontendDomain + "?canceled=true"),
			AutomaticTax: &stripe.CheckoutSessionAutomaticTaxParams{Enabled: stripe.Bool(true)},
		}

		sess, err := session.New(params)
		if err != nil {
			return err
		}

		checkoutURI = sess.PaymentLink.URL

		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreateCheckoutSessionResponse{
		CheckoutUri: checkoutURI,
	}), nil
}
