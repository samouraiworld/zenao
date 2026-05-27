package main

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"slices"
	"sort"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/payment"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

const (
	ticketHoldExpiryBuffer = time.Minute
)

type checkoutCartRow struct {
	price      *zeni.Price
	priceGroup *zeni.PriceGroup
	quantity   uint32
	emails     []string
}

type checkoutCart struct {
	rows           map[string]*checkoutCartRow
	currencyCode   string
	paymentAccount *zeni.PaymentAccount
	allEmails      []string
	totalAmount    int64
}

func (s *ZenaoServer) StartTicketPayment(
	ctx context.Context,
	req *connect.Request[zenaov1.StartTicketPaymentRequest],
) (*connect.Response[zenaov1.StartTicketPaymentResponse], error) {
	actor, err := s.GetOptionalActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	if err := validateStartTicketPaymentRequest(s, req); err != nil {
		return nil, err
	}

	nowUnix := time.Now().Unix()
	var (
		evt             *zeni.Event
		createdOrder    *zeni.Order
		paymentProvider payment.Payment
		buyerEmail      string
		cart            *checkoutCart
		ok              bool
	)

	if err := s.DB.TxWithSpan(ctx, "db.StartTicketPayment", func(tx zeni.DB) error {
		var err error

		priceGroups, err := tx.GetPriceGroupsByEvent(req.Msg.EventId)
		if err != nil {
			return err
		}

		priceMap := mapPricesFromGroups(priceGroups)
		priceGroupsMap := mapPriceGroups(priceGroups)

		cart, err = buildCheckoutCart(req.Msg.LineItems, priceMap, priceGroupsMap)
		if err != nil {
			return err
		}

		attendeesUsers, err := s.EnsureUsersFromEmails(ctx, cart.allEmails)
		if err != nil {
			return err
		}

		buyerEmail = cart.allEmails[0]
		buyerID, err := resolveBuyerID(actor, attendeesUsers, buyerEmail)
		if err != nil {
			return err
		}

		evt, err = loadEventForCheckout(tx, req.Msg.EventId, req.Msg.Password)
		if err != nil {
			return err
		}

		paymentProvider, ok = s.PaymentProviders[cart.paymentAccount.PlatformType]
		if !ok {
			return errors.New("payment provider not found")
		}

		if err := tx.DeleteExpiredTicketHolds(req.Msg.EventId, nowUnix); err != nil {
			return err
		}

		if err := ensureCheckoutCapacity(tx, req.Msg.EventId, cart, priceGroupsMap, nowUnix); err != nil {
			return err
		}

		orderAttendees, err := createOrderAttendeesFromCart(cart, attendeesUsers, nowUnix)
		if err != nil {
			return err
		}

		createdOrder, err = tx.CreateOrder(&zeni.Order{
			CreatedAt:        nowUnix,
			EventID:          evt.ID,
			BuyerID:          buyerID,
			CurrencyCode:     strings.ToUpper(strings.TrimSpace(cart.currencyCode)),
			AmountMinor:      cart.totalAmount,
			Status:           zeni.OrderStatusPending,
			PaymentProvider:  paymentProvider.PlatformType(),
			PaymentAccountID: cart.paymentAccount.ID,
		}, orderAttendees)
		if err != nil {
			return err
		}

		if err := createTicketHoldsFromCart(tx, createdOrder.ID, cart, nowUnix, paymentProvider.DefaultHoldTTL()); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	successURL, err := buildCheckoutRedirectURL(s.AppBaseURL, req.Msg.SuccessPath, map[string]string{
		"checkout":   "success",
		"order_id":   createdOrder.ID,
		"session_id": "CHECKOUT_SESSION_ID",
	})
	if err != nil {
		return nil, err
	}
	successURL = strings.ReplaceAll(successURL, "CHECKOUT_SESSION_ID", "{CHECKOUT_SESSION_ID}")

	cancelURL, err := buildCheckoutRedirectURL(s.AppBaseURL, req.Msg.CancelPath, map[string]string{
		"checkout": "cancel",
		"order_id": createdOrder.ID,
	})
	if err != nil {
		return nil, err
	}

	lineItems := []payment.LineItem{}
	for _, item := range cart.rows {
		lineItems = append(lineItems, payment.LineItem{
			Quantity:    item.quantity,
			AmountMinor: item.price.AmountMinor,
		})
	}

	session, err := paymentProvider.CreateCheckoutSession(ctx, payment.CheckoutSessionInput{
		EventTitle:        evt.Title,
		OrderID:           createdOrder.ID,
		CustomerEmail:     buyerEmail,
		Currency:          cart.currencyCode,
		Now:               nowUnix,
		LineItems:         lineItems,
		SuccessURL:        successURL,
		CancelURL:         cancelURL,
		ProviderAccountID: cart.paymentAccount.PlatformAccountID,
	})
	if err != nil {
		failOrderAndReleaseHolds(ctx, s.DB, createdOrder.ID)
		return nil, fmt.Errorf("create payment %s checkout session: %w", paymentProvider.PlatformType(), err)
	}

	if err := s.DB.WithContext(ctx).UpdateOrderSetPaymentSession(
		createdOrder.ID,
		paymentProvider.PlatformType(),
		session.ID,
	); err != nil {
		failOrderAndReleaseHolds(ctx, s.DB, createdOrder.ID)
		return nil, err
	}

	s.Logger.Info("start-ticket-payment",
		zap.String("event-id", req.Msg.EventId),
		zap.String("order-id", createdOrder.ID),
		zap.String("payment-provider", createdOrder.PaymentProvider),
		zap.String("payment-session-id", session.ID),
	)

	return connect.NewResponse(&zenaov1.StartTicketPaymentResponse{
		CheckoutUrl: session.URL,
		OrderId:     createdOrder.ID,
	}), nil
}

func resolveBuyerID(
	actor *Actor,
	attendeeUsers map[string]*zeni.User,
	customerEmail string,
) (string, error) {
	if actor != nil {
		return actor.UserID(), nil
	}

	user, ok := attendeeUsers[customerEmail]
	if !ok || user == nil {
		return "", errors.New("failed to resolve buyer account")
	}
	return user.ID, nil
}

func failOrderAndReleaseHolds(ctx context.Context, db zeni.DB, orderID string) {
	_ = db.WithContext(ctx).UpdateOrderSetStatus(orderID, zeni.OrderStatusFailed)
	_ = db.WithContext(ctx).DeleteTicketHoldsByOrderID(orderID)
}

func validateStartTicketPaymentRequest(
	s *ZenaoServer,
	req *connect.Request[zenaov1.StartTicketPaymentRequest],
) error {
	if s.AppBaseURL == "" {
		return errors.New("app base url is not configured")
	}
	if req.Msg.EventId == "" {
		return errors.New("event id is required")
	}
	if len(req.Msg.LineItems) == 0 {
		return errors.New("line items are required")
	}
	if err := validatePasswordLength(req.Msg.Password); err != nil {
		return err
	}
	if strings.TrimSpace(req.Msg.SuccessPath) == "" {
		return errors.New("success path is required")
	}
	if strings.TrimSpace(req.Msg.CancelPath) == "" {
		return errors.New("cancel path is required")
	}
	return nil
}

func loadEventForCheckout(tx zeni.DB, eventID string, password string) (*zeni.Event, error) {
	evt, err := tx.GetEvent(eventID)
	if err != nil {
		return nil, err
	}
	if evt == nil {
		return nil, errors.New("event not found")
	}
	if evt.PasswordHash == "" {
		return evt, nil
	}
	valid, err := tx.ValidatePassword(&zenaov1.ValidatePasswordRequest{
		EventId:  eventID,
		Password: password,
	})
	if err != nil {
		return nil, err
	}
	if !valid {
		return nil, errors.New("invalid password")
	}
	return evt, nil
}

func buildCheckoutCart(items []*zenaov1.StartTicketPaymentLineItem, prices map[string]*zeni.Price, priceGroups map[string]*zeni.PriceGroup) (*checkoutCart, error) {
	result := &checkoutCart{
		rows:           make(map[string]*checkoutCartRow, len(items)),
		currencyCode:   "",
		paymentAccount: nil,
		totalAmount:    0,
	}

	for _, item := range items {
		if item == nil {
			return nil, fmt.Errorf("checkout line item is nil")
		}

		if _, ok := prices[item.PriceId]; !ok {
			return nil, fmt.Errorf("price %s not found", item.PriceId)
		}

		item.AttendeeEmail = strings.TrimSpace(strings.ToLower(item.AttendeeEmail))
		if err := validateEmailAddress(item.AttendeeEmail); err != nil {
			return nil, fmt.Errorf("invalid attendee email: %w", err)
		}

		if result.currencyCode == "" {
			result.currencyCode = strings.ToUpper(strings.TrimSpace(prices[item.PriceId].CurrencyCode))
		} else if result.currencyCode != strings.ToUpper(strings.TrimSpace(prices[item.PriceId].CurrencyCode)) {
			return nil, errors.New("multiple currencies are not supported")
		}

		if result.paymentAccount == nil {
			result.paymentAccount = prices[item.PriceId].PaymentAccount
		} else if prices[item.PriceId].PaymentAccount == nil {
			return nil, errors.New("no payment account found")
		} else if result.paymentAccount.ID != prices[item.PriceId].PaymentAccount.ID {
			return nil, errors.New("multiple payment accounts are not supported")
		}

		if _, ok := priceGroups[prices[item.PriceId].PriceGroupID]; !ok {
			return nil, fmt.Errorf("price group %s not found", prices[item.PriceId].PriceGroupID)
		}

		if _, ok := result.rows[item.PriceId]; !ok {
			result.rows[item.PriceId] = &checkoutCartRow{
				price:      prices[item.PriceId],
				priceGroup: priceGroups[prices[item.PriceId].PriceGroupID],
				quantity:   0,
				emails:     nil,
			}
		}

		if prices[item.PriceId].AmountMinor <= 0 {
			return nil, errors.New("event is free")
		} else if prices[item.PriceId].CurrencyCode == "" {
			return nil, errors.New("missing currency code for price")
		}

		result.rows[item.PriceId].quantity++
		result.rows[item.PriceId].emails = append(result.rows[item.PriceId].emails, item.AttendeeEmail)
		result.allEmails = append(result.allEmails, item.AttendeeEmail)
		result.totalAmount += prices[item.PriceId].AmountMinor
		result.paymentAccount = prices[item.PriceId].PaymentAccount
	}

	if result.paymentAccount == nil {
		return nil, errors.New("no payment account found")
	}

	if result.totalAmount == 0 {
		return nil, errors.New("no tickets selected")
	}

	dedupEmails := append(result.allEmails[:0:0], result.allEmails...)
	sort.Strings(dedupEmails)
	dedupEmails = slices.Compact(dedupEmails)

	if len(dedupEmails) != len(result.allEmails) {
		return nil, errors.New("duplicate attendee email")
	}

	return result, nil
}

func ensureCheckoutCapacity(
	tx zeni.DB,
	eventID string,
	cart *checkoutCart,
	priceGroup map[string]*zeni.PriceGroup,
	nowUnix int64,
) error {
	quantityOrderedByGroup := map[string]int{}

	for _, row := range cart.rows {
		quantityOrderedByGroup[row.priceGroup.ID] += int(row.quantity)
	}

	for priceGroupID, quantity := range quantityOrderedByGroup {
		if _, ok := priceGroup[priceGroupID]; !ok {
			return fmt.Errorf("price group %s not found", priceGroupID)
		}

		soldCount, err := tx.CountEventSoldTickets(eventID, priceGroupID)
		if err != nil {
			return err
		}
		heldCount, err := tx.CountActiveTicketHolds(eventID, priceGroupID, nowUnix)
		if err != nil {
			return err
		}
		remaining := int64(priceGroup[priceGroupID].Capacity) - int64(soldCount) - int64(heldCount)
		if remaining < int64(quantity) {
			return errors.New("sold out")
		}
	}
	return nil
}

func createOrderAttendeesFromCart(
	cart *checkoutCart,
	attendeeUsers map[string]*zeni.User,
	nowUnix int64,
) ([]*zeni.OrderAttendee, error) {
	attendees := make([]*zeni.OrderAttendee, 0)

	for _, row := range cart.rows {
		for _, email := range row.emails {
			if _, ok := attendeeUsers[email]; !ok {
				return nil, errors.New("attendee user not found")
			}

			user := attendeeUsers[email]

			attendees = append(attendees, &zeni.OrderAttendee{
				CreatedAt:    nowUnix,
				PriceID:      row.price.ID,
				PriceGroupID: row.priceGroup.ID,
				UserID:       user.ID,
				AmountMinor:  row.price.AmountMinor,
				CurrencyCode: row.price.CurrencyCode,
			})
		}
	}

	if len(attendees) == 0 {
		return nil, errors.New("attendee user not found")
	}

	return attendees, nil
}

func createTicketHoldsFromCart(tx zeni.DB, orderID string, cart *checkoutCart, nowUnix int64, ttl time.Duration) error {
	holdExpiresAt := nowUnix + int64((ttl + ticketHoldExpiryBuffer).Seconds())
	for _, row := range cart.rows {
		if row.quantity == 0 {
			continue
		}
		_, err := tx.CreateTicketHold(&zeni.TicketHold{
			CreatedAt:    nowUnix,
			EventID:      row.priceGroup.EventID,
			PriceGroupID: row.priceGroup.ID,
			OrderID:      orderID,
			Quantity:     row.quantity,
			ExpiresAt:    holdExpiresAt,
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func buildCheckoutRedirectURL(baseURL string, rawPath string, params map[string]string) (string, error) {
	callbackURL, err := buildCallbackURL(baseURL, rawPath)
	if err != nil {
		return "", err
	}
	parsed, err := url.Parse(callbackURL)
	if err != nil {
		return "", fmt.Errorf("parse callback url: %w", err)
	}
	query := parsed.Query()
	for key, value := range params {
		if strings.TrimSpace(value) == "" {
			continue
		}
		query.Set(key, value)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func mapPricesFromGroups(groups []*zeni.PriceGroup) map[string]*zeni.Price {
	mapped := map[string]*zeni.Price{}
	for _, group := range groups {
		for _, price := range group.Prices {
			mapped[price.ID] = price
		}
	}

	return mapped
}

func mapPriceGroups(groups []*zeni.PriceGroup) map[string]*zeni.PriceGroup {
	mapped := map[string]*zeni.PriceGroup{}
	for _, group := range groups {
		mapped[group.ID] = group
	}

	return mapped
}
