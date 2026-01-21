package main

import (
	"context"
	"errors"
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

	users, err := s.DB.WithContext(ctx).GetUsersByIDs([]string{order.BuyerID})
	if err != nil {
		return err
	}
	if len(users) == 0 || users[0] == nil || strings.TrimSpace(users[0].AuthID) == "" {
		return errors.New("buyer auth id not found")
	}

	authUsers, err := s.Auth.GetUsersFromIDs(ctx, []string{users[0].AuthID})
	if err != nil {
		return err
	}
	if len(authUsers) == 0 || authUsers[0] == nil || strings.TrimSpace(authUsers[0].Email) == "" {
		return errors.New("buyer email not found")
	}

	evt, err := s.DB.WithContext(ctx).GetEvent(order.EventID)
	if err != nil {
		return err
	}
	if evt == nil {
		return errors.New("event not found")
	}

	htmlStr, text, err := purchaseConfirmationMailContent(evt, "Purchase confirmed! Your tickets will arrive in a separate email.")
	if err != nil {
		return err
	}

	tracer := otel.Tracer("mail")
	mailCtx, span := tracer.Start(ctx, "mail.ConfirmTicketPayment", trace.WithSpanKind(trace.SpanKindClient))
	defer span.End()

	_, err = s.MailClient.Emails.SendWithContext(mailCtx, &resend.SendEmailRequest{
		// XXX: Replace sender name with organizer name
		From:    "Zenao <" + s.MailSender + ">",
		To:      []string{authUsers[0].Email},
		Subject: evt.Title + " - Purchase confirmed",
		Html:    htmlStr,
		Text:    text,
	})
	return err
}
