package main

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/payment"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

func (s *ZenaoServer) ConfirmTicketPayment(
	ctx context.Context,
	req *connect.Request[zenaov1.ConfirmTicketPaymentRequest],
) (*connect.Response[zenaov1.ConfirmTicketPaymentResponse], error) {
	if err := validateConfirmTicketPaymentRequest(req); err != nil {
		return nil, err
	}

	orderID := strings.TrimSpace(req.Msg.OrderId)
	order, err := s.DB.WithContext(ctx).GetOrder(orderID)
	if err != nil {
		s.Logger.Error("confirm-ticket-payment", zap.Error(err), zap.String("order-id", orderID))
		return nil, err
	}
	if order == nil {
		return nil, errors.New("order not found")
	}

	sessionID := strings.TrimSpace(req.Msg.CheckoutSessionId)
	if sessionID == "" {
		sessionID = strings.TrimSpace(order.PaymentSessionID)
	}
	if sessionID == "" {
		return nil, errors.New("checkout session id is required")
	}
	if strings.TrimSpace(req.Msg.CheckoutSessionId) != "" &&
		strings.TrimSpace(order.PaymentSessionID) != "" &&
		sessionID != strings.TrimSpace(order.PaymentSessionID) {
		return nil, errors.New("checkout session mismatch")
	}

	if order.Status == zeni.OrderStatusSuccess && order.ConfirmedAt != nil && *order.ConfirmedAt > 0 {
		s.issueTicketsAfterConfirmation(ctx, order)
		return connect.NewResponse(&zenaov1.ConfirmTicketPaymentResponse{
			OrderId:          order.ID,
			Status:           string(order.Status),
			ReceiptReference: order.PaymentIntentID,
		}), nil
	}

	account, err := s.DB.WithContext(ctx).GetOrderPaymentAccount(orderID)
	if err != nil {
		s.Logger.Error("confirm-ticket-payment", zap.Error(err), zap.String("order-id", orderID))
		return nil, err
	}
	if account == nil || strings.TrimSpace(account.PlatformType) == "" || strings.TrimSpace(account.PlatformAccountID) == "" {
		return nil, errors.New("payment account not found")
	}

	provider, ok := s.PaymentProviders[account.PlatformType]
	if !ok {
		return nil, errors.New("payment provider not found")
	}

	sessionFetcher, ok := provider.(payment.CheckoutSessionFetcher)
	if !ok {
		return nil, errors.New("payment provider does not support checkout session lookup")
	}

	session, err := sessionFetcher.GetCheckoutSession(ctx, sessionID, account.PlatformAccountID)
	if err != nil {
		s.Logger.Error("confirm-ticket-payment", zap.Error(err), zap.String("order-id", orderID), zap.String("session-id", sessionID))
		return nil, err
	}

	status := mapCheckoutPaymentStatus(session.PaymentStatus)
	response := &zenaov1.ConfirmTicketPaymentResponse{
		OrderId:          order.ID,
		Status:           string(status),
		ReceiptReference: session.PaymentIntentID,
	}

	if status == zeni.OrderStatusSuccess {
		confirmedAt := time.Now().Unix()
		updated, err := s.DB.WithContext(ctx).UpdateOrderConfirmationOnce(order.ID, status, session.PaymentIntentID, confirmedAt)
		if err != nil {
			s.Logger.Error("confirm-ticket-payment", zap.Error(err), zap.String("order-id", orderID))
			return nil, err
		}
		if updated {
			if err := s.sendPurchaseConfirmationEmail(ctx, order); err != nil {
				s.Logger.Error("confirm-ticket-payment", zap.Error(err), zap.String("order-id", orderID))
			}
		}
		s.issueTicketsAfterConfirmation(ctx, order)
	} else if status == zeni.OrderStatusPending && order.Status != zeni.OrderStatusSuccess && order.Status != zeni.OrderStatusPending {
		if err := s.DB.WithContext(ctx).UpdateOrderSetStatus(order.ID, status); err != nil {
			s.Logger.Error("confirm-ticket-payment", zap.Error(err), zap.String("order-id", orderID))
		}
	}

	return connect.NewResponse(response), nil
}

func (s *ZenaoServer) issueTicketsAfterConfirmation(ctx context.Context, order *zeni.Order) {
	if order == nil || s.DB == nil || s.Logger == nil {
		return
	}

	if order.TicketIssueStatus == zeni.TicketIssueStatusIssued {
		return
	}

	tracer := otel.Tracer("ticketing")
	issueCtx, span := tracer.Start(ctx, "tickets.IssueAfterPayment", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	issuedCount, err := s.issueOrderTickets(issueCtx, order)
	if err != nil {
		s.Logger.Error("ticket-issuance-failed", zap.Error(err), zap.String("order-id", order.ID))
		if updateErr := s.DB.WithContext(issueCtx).UpdateOrderTicketIssue(order.ID, zeni.TicketIssueStatusFailed, trimTicketIssueError(err)); updateErr != nil {
			s.Logger.Error("ticket-issuance-update-failed", zap.Error(updateErr), zap.String("order-id", order.ID))
		}
		return
	}

	if err := s.DB.WithContext(issueCtx).UpdateOrderTicketIssue(order.ID, zeni.TicketIssueStatusIssued, ""); err != nil {
		s.Logger.Error("ticket-issuance-update-failed", zap.Error(err), zap.String("order-id", order.ID))
		return
	}

	s.Logger.Info("ticket-issuance-complete",
		zap.String("order-id", order.ID),
		zap.Int("issued-count", issuedCount),
	)

	// Tickets just transitioned to "issued": this block runs exactly once per
	// order (the early-return above guards re-entry), so it is safe to deliver
	// the ticket email here without resending it on every confirm poll.
	//
	// Building the email generates a PDF per ticket and can be slow for large
	// orders, so it runs off the request path. The issued transition is already
	// committed, so the confirm endpoint can return immediately. A detached
	// context keeps the send alive after the request context is cancelled.
	emailCtx := context.WithoutCancel(issueCtx)
	go func() {
		if err := s.sendOrderTicketsEmail(emailCtx, order); err != nil {
			s.Logger.Error("send-order-tickets-email", zap.Error(err), zap.String("order-id", order.ID))
		}
	}()
}

// sendOrderTicketsEmail delivers a single email to the buyer with every ticket
// of the order: each one as an inline QR code in the body and as an attached
// PDF, plus an ICS calendar invite. The QR codes (entry tokens) go only to the
// buyer, never to attendee-provided emails, following standard ticketing
// practice (the buyer paid and controls distribution).
func (s *ZenaoServer) sendOrderTicketsEmail(ctx context.Context, order *zeni.Order) error {
	if s.MailClient == nil || s.Auth == nil || order == nil {
		return nil
	}

	buyerEmail, err := s.userEmail(ctx, order.BuyerID)
	if err != nil {
		return err
	}

	tickets, err := s.DB.WithContext(ctx).GetOrderTickets(order.ID)
	if err != nil {
		return err
	}
	if len(tickets) == 0 {
		return errors.New("order has no tickets")
	}

	evt, err := s.DB.WithContext(ctx).GetEvent(order.EventID)
	if err != nil {
		return err
	}
	if evt == nil {
		return errors.New("event not found")
	}

	// Resolve attendee emails to label each ticket inside the buyer's own email.
	authIDs := make([]string, 0, len(tickets))
	for _, ticket := range tickets {
		if ticket == nil || ticket.User == nil || strings.TrimSpace(ticket.User.AuthID) == "" {
			continue
		}
		authIDs = append(authIDs, ticket.User.AuthID)
	}
	authUsers, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
	if err != nil {
		return err
	}
	emailByAuthID := make(map[string]string, len(authUsers))
	for _, user := range authUsers {
		if user != nil {
			emailByAuthID[user.ID] = user.Email
		}
	}

	items := make([]ticketEmailItem, 0, len(tickets))
	for _, ticket := range tickets {
		if ticket == nil || ticket.Ticket == nil {
			continue
		}
		email := ""
		displayName := ""
		if ticket.User != nil {
			email = emailByAuthID[ticket.User.AuthID]
			displayName = ticket.User.DisplayName
		}
		items = append(items, ticketEmailItem{
			Secret:      ticket.Ticket.Secret(),
			DisplayName: displayName,
			Email:       email,
		})
	}

	qrs, attachments, err := buildTicketEmailAttachments(evt, items, s.MailSender, s.Logger)
	if err != nil {
		return err
	}

	htmlStr, text, err := ticketsConfirmationMailContent(evt, "Your tickets are attached and shown below.", qrs)
	if err != nil {
		return err
	}

	tracer := otel.Tracer("mail")
	mailCtx, span := tracer.Start(ctx, "mail.OrderTickets", trace.WithSpanKind(trace.SpanKindClient))
	defer span.End()

	// XXX: Replace sender name with organizer name
	_, err = s.MailClient.Emails.SendWithContext(mailCtx, &resend.SendEmailRequest{
		From:        fmt.Sprintf("Zenao <%s>", s.MailSender),
		To:          []string{buyerEmail},
		Subject:     fmt.Sprintf("%s - Your tickets", evt.Title),
		Html:        htmlStr,
		Text:        text,
		Attachments: attachments,
	})
	return err
}

// resolvePaymentSeller builds the merchant-of-record details shown to the buyer.
// It prefers the Stripe business profile mirrored on the payment account and
// falls back to the community display name.
func (s *ZenaoServer) resolvePaymentSeller(ctx context.Context, order *zeni.Order) paymentSeller {
	seller := paymentSeller{}

	if communities, err := s.DB.WithContext(ctx).CommunitiesByEvent(order.EventID); err != nil {
		s.Logger.Error("resolve-payment-seller", zap.Error(err), zap.String("order-id", order.ID))
	} else if len(communities) > 0 && communities[0] != nil {
		seller.Name = communities[0].DisplayName
	}

	account, err := s.DB.WithContext(ctx).GetOrderPaymentAccount(order.ID)
	if err != nil {
		s.Logger.Error("resolve-payment-seller", zap.Error(err), zap.String("order-id", order.ID))
		return seller
	}
	if account != nil {
		if name := strings.TrimSpace(account.BusinessName); name != "" {
			seller.Name = name
		} else if name := strings.TrimSpace(account.LegalName); name != "" {
			seller.Name = name
		}
		seller.SupportEmail = strings.TrimSpace(account.SupportEmail)
		seller.Address = strings.TrimSpace(account.BusinessAddress)
	}

	return seller
}

// userEmail resolves a Zenao user ID to its authenticated email address.
func (s *ZenaoServer) userEmail(ctx context.Context, userID string) (string, error) {
	users, err := s.DB.WithContext(ctx).GetUsersByIDs([]string{userID})
	if err != nil {
		return "", err
	}
	if len(users) == 0 || users[0] == nil || strings.TrimSpace(users[0].AuthID) == "" {
		return "", errors.New("user auth id not found")
	}

	authUsers, err := s.Auth.GetUsersFromIDs(ctx, []string{users[0].AuthID})
	if err != nil {
		return "", err
	}
	if len(authUsers) == 0 || authUsers[0] == nil || strings.TrimSpace(authUsers[0].Email) == "" {
		return "", errors.New("user email not found")
	}
	return authUsers[0].Email, nil
}

func (s *ZenaoServer) issueOrderTickets(ctx context.Context, order *zeni.Order) (int, error) {
	if order == nil {
		return 0, errors.New("order is required")
	}

	issuedCount := 0
	tracer := otel.Tracer("ticketing")
	txCtx, span := tracer.Start(ctx, "db.IssueOrderTickets", trace.WithSpanKind(trace.SpanKindClient))
	defer span.End()

	err := s.DB.WithContext(txCtx).Tx(func(tx zeni.DB) error {
		attendees, err := tx.GetOrderAttendees(order.ID)
		if err != nil {
			return err
		}
		if len(attendees) == 0 {
			return errors.New("order attendees not found")
		}

		existingIDs, err := tx.ListOrderAttendeeTicketIDs(order.ID)
		if err != nil {
			return err
		}
		existing := map[string]struct{}{}
		for _, id := range existingIDs {
			existing[id] = struct{}{}
		}

		newTickets := make([]*zeni.SoldTicket, 0)
		for _, attendee := range attendees {
			if attendee == nil {
				return errors.New("order attendee is nil")
			}
			attendeeID := attendee.ID
			if attendeeID == "" {
				return errors.New("order attendee id is required")
			}
			if _, ok := existing[attendeeID]; ok {
				continue
			}

			ticket, err := zeni.NewTicket()
			if err != nil {
				return err
			}

			newTickets = append(newTickets, &zeni.SoldTicket{
				Ticket:          ticket,
				EventID:         order.EventID,
				BuyerID:         order.BuyerID,
				UserID:          attendee.UserID,
				OrderID:         order.ID,
				PriceID:         attendee.PriceID,
				PriceGroupID:    attendee.PriceGroupID,
				OrderAttendeeID: attendeeID,
				AmountMinor:     attendee.AmountMinor,
				CurrencyCode:    attendee.CurrencyCode,
			})
		}

		if len(newTickets) == 0 {
			return nil
		}

		if err := tx.CreateSoldTickets(newTickets); err != nil {
			return err
		}
		issuedCount = len(newTickets)
		return nil
	})
	return issuedCount, err
}

func trimTicketIssueError(err error) string {
	if err == nil {
		return ""
	}
	msg := strings.TrimSpace(err.Error())
	if msg == "" {
		return ""
	}
	const maxLen = 1000
	if len(msg) <= maxLen {
		return msg
	}
	return msg[:maxLen]
}

func validateConfirmTicketPaymentRequest(req *connect.Request[zenaov1.ConfirmTicketPaymentRequest]) error {
	if req == nil || req.Msg == nil {
		return errors.New("request is required")
	}
	if strings.TrimSpace(req.Msg.OrderId) == "" {
		return errors.New("order id is required")
	}
	return nil
}

func mapCheckoutPaymentStatus(status payment.PaymentStatus) zeni.OrderStatus {
	switch status {
	case payment.PaymentStatusPaid, payment.PaymentStatusNoPaymentRequired:
		return zeni.OrderStatusSuccess
	case payment.PaymentStatusUnpaid:
		return zeni.OrderStatusPending
	default:
		return zeni.OrderStatusPending
	}
}

func (s *ZenaoServer) sendPurchaseConfirmationEmail(ctx context.Context, order *zeni.Order) error {
	if s.MailClient == nil || s.Auth == nil || order == nil {
		return nil
	}

	buyerEmail, err := s.userEmail(ctx, order.BuyerID)
	if err != nil {
		return err
	}

	evt, err := s.DB.WithContext(ctx).GetEvent(order.EventID)
	if err != nil {
		return err
	}
	if evt == nil {
		return errors.New("event not found")
	}

	seller := s.resolvePaymentSeller(ctx, order)

	htmlStr, text, err := purchaseConfirmationMailContent(evt, order, seller, "Purchase confirmed! Your tickets will arrive in a separate email.")
	if err != nil {
		return err
	}

	tracer := otel.Tracer("mail")
	mailCtx, span := tracer.Start(ctx, "mail.ConfirmTicketPayment", trace.WithSpanKind(trace.SpanKindClient))
	defer span.End()

	_, err = s.MailClient.Emails.SendWithContext(mailCtx, &resend.SendEmailRequest{
		// XXX: Replace sender name with organizer name
		From:    "Zenao <" + s.MailSender + ">",
		To:      []string{buyerEmail},
		Subject: evt.Title + " - Purchase confirmed",
		Html:    htmlStr,
		Text:    text,
	})
	return err
}
