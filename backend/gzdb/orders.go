package gzdb

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
)

type Order struct {
	ID                string `gorm:"primaryKey;type:text"`
	CreatedAt         int64  `gorm:"not null"`
	EventID           uint   `gorm:"index;not null"`
	BuyerID           uint   `gorm:"index;not null"`
	CurrencyCode      string `gorm:"not null"`
	AmountMinor       int64  `gorm:"not null"`
	Status            string `gorm:"not null"`
	PaymentProvider   string
	PaymentAccountID  uint `gorm:"index;not null"`
	PaymentSessionID  string
	PaymentIntentID   string
	ConfirmedAt       *int64
	InvoiceID         string
	InvoiceURL        string
	TicketIssueStatus string
	TicketIssueError  string
	Event             *Event          `gorm:"foreignKey:EventID"`
	PaymentAccount    *PaymentAccount `gorm:"foreignKey:PaymentAccountID"`
}

type OrderAttendee struct {
	ID           string      `gorm:"primaryKey;type:text"`
	CreatedAt    int64       `gorm:"not null"`
	OrderID      string      `gorm:"index;not null"`
	PriceID      uint        `gorm:"index;not null"`
	PriceGroupID uint        `gorm:"index;not null"`
	UserID       uint        `gorm:"index;not null"`
	AmountMinor  int64       `gorm:"not null"`
	CurrencyCode string      `gorm:"not null"`
	Order        *Order      `gorm:"foreignKey:OrderID"`
	Price        *Price      `gorm:"foreignKey:PriceID"`
	PriceGroup   *PriceGroup `gorm:"foreignKey:PriceGroupID"`
}

type TicketHold struct {
	ID           uint        `gorm:"primaryKey"`
	CreatedAt    int64       `gorm:"not null"`
	EventID      uint        `gorm:"index;not null"`
	PriceGroupID uint        `gorm:"index;not null"`
	OrderID      string      `gorm:"index;not null"`
	Quantity     uint32      `gorm:"not null"`
	ExpiresAt    int64       `gorm:"index;not null"`
	Event        *Event      `gorm:"foreignKey:EventID"`
	PriceGroup   *PriceGroup `gorm:"foreignKey:PriceGroupID"`
	Order        *Order      `gorm:"foreignKey:OrderID"`
}

func dbOrderToZeniOrder(dbOrder *Order) *zeni.Order {
	if dbOrder == nil {
		return nil
	}

	return &zeni.Order{
		CreatedAt:         dbOrder.CreatedAt,
		ID:                dbOrder.ID,
		EventID:           fmt.Sprintf("%d", dbOrder.EventID),
		BuyerID:           fmt.Sprintf("%d", dbOrder.BuyerID),
		CurrencyCode:      dbOrder.CurrencyCode,
		AmountMinor:       dbOrder.AmountMinor,
		Status:            zeni.OrderStatus(dbOrder.Status),
		PaymentProvider:   dbOrder.PaymentProvider,
		PaymentAccountID:  fmt.Sprintf("%d", dbOrder.PaymentAccountID),
		PaymentSessionID:  dbOrder.PaymentSessionID,
		PaymentIntentID:   dbOrder.PaymentIntentID,
		ConfirmedAt:       dbOrder.ConfirmedAt,
		InvoiceID:         dbOrder.InvoiceID,
		InvoiceURL:        dbOrder.InvoiceURL,
		TicketIssueStatus: zeni.TicketIssueStatus(dbOrder.TicketIssueStatus),
		TicketIssueError:  dbOrder.TicketIssueError,
	}
}

// CreateOrder implements zeni.DB.
func (g *gormZenaoDB) CreateOrder(order *zeni.Order, attendees []*zeni.OrderAttendee) (*zeni.Order, error) {
	if order == nil {
		return nil, errors.New("order is nil")
	}
	eventIDInt, err := strconv.ParseUint(order.EventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}
	createdAt := order.CreatedAt
	if createdAt == 0 {
		createdAt = time.Now().Unix()
	}
	status := order.Status
	if status == "" {
		status = zeni.OrderStatusPending
	}
	id := order.ID
	if id == "" {
		id = uuid.NewString()
	}

	buyerIDInt, err := strconv.ParseUint(order.BuyerID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse buyer id: %w", err)
	}

	paymentAccountIDInt, err := strconv.ParseUint(order.PaymentAccountID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse payment account id: %w", err)
	}

	dbOrder := &Order{
		ID:                id,
		CreatedAt:         createdAt,
		EventID:           uint(eventIDInt),
		BuyerID:           uint(buyerIDInt),
		CurrencyCode:      order.CurrencyCode,
		AmountMinor:       order.AmountMinor,
		Status:            string(status),
		PaymentProvider:   order.PaymentProvider,
		PaymentAccountID:  uint(paymentAccountIDInt),
		PaymentSessionID:  order.PaymentSessionID,
		PaymentIntentID:   order.PaymentIntentID,
		ConfirmedAt:       order.ConfirmedAt,
		InvoiceID:         order.InvoiceID,
		InvoiceURL:        order.InvoiceURL,
		TicketIssueStatus: string(order.TicketIssueStatus),
		TicketIssueError:  order.TicketIssueError,
	}
	if err := g.db.Create(dbOrder).Error; err != nil {
		return nil, err
	}

	if err := g.createOrderAttendees(dbOrder.ID, attendees); err != nil {
		return nil, err
	}

	return dbOrderToZeniOrder(dbOrder), nil
}

func (g *gormZenaoDB) createOrderAttendees(orderID string, attendees []*zeni.OrderAttendee) error {
	if len(attendees) == 0 {
		return nil
	}
	dbAttendees := make([]OrderAttendee, 0, len(attendees))
	for _, attendee := range attendees {
		if attendee == nil {
			return errors.New("order attendee is nil")
		}

		id := strings.TrimSpace(attendee.ID)
		if id == "" {
			id = uuid.NewString()
		}

		userIDInt, err := strconv.ParseUint(attendee.UserID, 10, 64)
		if err != nil {
			return fmt.Errorf("parse user id: %w", err)
		}

		priceIDInt, err := strconv.ParseUint(attendee.PriceID, 10, 64)
		if err != nil {
			return fmt.Errorf("parse price id: %w", err)
		}

		priceGroupIDInt, err := strconv.ParseUint(attendee.PriceGroupID, 10, 64)
		if err != nil {
			return fmt.Errorf("parse price group id: %w", err)
		}

		dbAttendees = append(dbAttendees, OrderAttendee{
			ID:           id,
			CreatedAt:    attendee.CreatedAt,
			OrderID:      orderID,
			PriceID:      uint(priceIDInt),
			PriceGroupID: uint(priceGroupIDInt),
			UserID:       uint(userIDInt),
			AmountMinor:  attendee.AmountMinor,
			CurrencyCode: attendee.CurrencyCode,
		})
	}
	return g.db.Create(&dbAttendees).Error
}

// GetOrder implements zeni.DB.
func (g *gormZenaoDB) GetOrder(orderID string) (*zeni.Order, error) {
	g, span := g.trace("gzdb.GetOrder")
	defer span.End()

	var order Order
	if err := g.db.First(&order, "id = ?", orderID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return dbOrderToZeniOrder(&order), nil
}

// GetOrderAttendees implements zeni.DB.
func (g *gormZenaoDB) GetOrderAttendees(orderID string) ([]*zeni.OrderAttendee, error) {
	g, span := g.trace("gzdb.GetOrderAttendees")
	defer span.End()

	var attendees []OrderAttendee
	if err := g.db.Where("order_id = ?", orderID).Order("created_at ASC, id ASC").Find(&attendees).Error; err != nil {
		return nil, err
	}

	result := make([]*zeni.OrderAttendee, 0, len(attendees))
	for _, attendee := range attendees {
		result = append(result, &zeni.OrderAttendee{
			ID:           attendee.ID,
			CreatedAt:    attendee.CreatedAt,
			OrderID:      attendee.OrderID,
			PriceID:      fmt.Sprintf("%d", attendee.PriceID),
			PriceGroupID: fmt.Sprintf("%d", attendee.PriceGroupID),
			UserID:       fmt.Sprintf("%d", attendee.UserID),
			AmountMinor:  attendee.AmountMinor,
			CurrencyCode: attendee.CurrencyCode,
		})
	}

	return result, nil
}

// GetOrderPaymentAccount implements zeni.DB.
func (g *gormZenaoDB) GetOrderPaymentAccount(orderID string) (*zeni.PaymentAccount, error) {
	g, span := g.trace("gzdb.GetOrderPaymentAccount")
	defer span.End()

	var account PaymentAccount
	err := g.db.Model(&PaymentAccount{}).
		Joins("JOIN prices ON prices.payment_account_id = payment_accounts.id").
		Joins("JOIN order_attendees ON order_attendees.price_id = prices.id").
		Where("order_attendees.order_id = ?", orderID).
		First(&account).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return dbPaymentAccountToZeniPaymentAccount(&account), nil
}

// UpdateOrderPaymentSession implements zeni.DB.
func (g *gormZenaoDB) UpdateOrderSetPaymentSession(orderID string, provider string, sessionID string) error {
	res := g.db.Model(&Order{}).Where("id = ?", orderID).Updates(map[string]any{
		"payment_provider":   provider,
		"payment_session_id": sessionID,
	})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// UpdateOrderConfirmation implements zeni.DB.
func (g *gormZenaoDB) UpdateOrderConfirmation(orderID string, status zeni.OrderStatus, paymentIntentID string, confirmedAt int64) error {
	g, span := g.trace("gzdb.UpdateOrderConfirmation")
	defer span.End()

	updates := map[string]any{
		"status":       status,
		"confirmed_at": confirmedAt,
	}
	if strings.TrimSpace(paymentIntentID) != "" {
		updates["payment_intent_id"] = paymentIntentID
	}

	res := g.db.Model(&Order{}).Where("id = ?", orderID).Updates(updates)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// UpdateOrderConfirmationOnce implements zeni.DB.
func (g *gormZenaoDB) UpdateOrderConfirmationOnce(orderID string, status zeni.OrderStatus, paymentIntentID string, confirmedAt int64) (bool, error) {
	g, span := g.trace("gzdb.UpdateOrderConfirmationOnce")
	defer span.End()

	updates := map[string]any{
		"status":       status,
		"confirmed_at": confirmedAt,
	}
	if strings.TrimSpace(paymentIntentID) != "" {
		updates["payment_intent_id"] = paymentIntentID
	}

	res := g.db.Model(&Order{}).
		Where("id = ? AND (confirmed_at IS NULL OR confirmed_at = 0 OR status != ?)", orderID, zeni.OrderStatusSuccess).
		Updates(updates)
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, nil
	}
	return true, nil
}

// UpdateOrderTicketIssue implements zeni.DB.
func (g *gormZenaoDB) UpdateOrderTicketIssue(orderID string, status zeni.TicketIssueStatus, errMsg string) error {
	g, span := g.trace("gzdb.UpdateOrderTicketIssue")
	defer span.End()

	updates := map[string]any{
		"ticket_issue_status": status,
		"ticket_issue_error":  errMsg,
	}

	res := g.db.Model(&Order{}).Where("id = ?", orderID).Updates(updates)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// UpdateOrderStatus implements zeni.DB.
func (g *gormZenaoDB) UpdateOrderSetStatus(orderID string, status zeni.OrderStatus) error {
	res := g.db.Model(&Order{}).Where("id = ?", orderID).Update("status", status)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// CreateTicketHold implements zeni.DB.
func (g *gormZenaoDB) CreateTicketHold(hold *zeni.TicketHold) (*zeni.TicketHold, error) {
	if hold == nil {
		return nil, errors.New("ticket hold is nil")
	}
	eventIDInt, err := strconv.ParseUint(hold.EventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}
	priceGroupIDInt, err := strconv.ParseUint(hold.PriceGroupID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse price group id: %w", err)
	}
	createdAt := hold.CreatedAt
	if createdAt == 0 {
		createdAt = time.Now().Unix()
	}
	dbHold := &TicketHold{
		CreatedAt:    createdAt,
		EventID:      uint(eventIDInt),
		PriceGroupID: uint(priceGroupIDInt),
		OrderID:      hold.OrderID,
		Quantity:     hold.Quantity,
		ExpiresAt:    hold.ExpiresAt,
	}
	if err := g.db.Create(dbHold).Error; err != nil {
		return nil, err
	}
	return &zeni.TicketHold{
		CreatedAt:    dbHold.CreatedAt,
		ID:           fmt.Sprintf("%d", dbHold.ID),
		EventID:      fmt.Sprintf("%d", dbHold.EventID),
		PriceGroupID: fmt.Sprintf("%d", dbHold.PriceGroupID),
		OrderID:      dbHold.OrderID,
		Quantity:     dbHold.Quantity,
		ExpiresAt:    dbHold.ExpiresAt,
	}, nil
}

// DeleteTicketHoldsByOrderID implements zeni.DB.
func (g *gormZenaoDB) DeleteTicketHoldsByOrderID(orderID string) error {
	return g.db.Where("order_id = ?", orderID).Delete(&TicketHold{}).Error
}

// DeleteExpiredTicketHolds implements zeni.DB.
func (g *gormZenaoDB) DeleteExpiredTicketHolds(eventID string, nowUnix int64) error {
	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse event id: %w", err)
	}
	return g.db.Where("event_id = ? AND expires_at <= ?", eventIDInt, nowUnix).Delete(&TicketHold{}).Error
}

// CountEventSoldTickets implements zeni.DB.
func (g *gormZenaoDB) CountEventSoldTickets(eventID string, priceGroupID string) (uint32, error) {
	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse event id: %w", err)
	}
	priceGroupIDInt, err := strconv.ParseUint(priceGroupID, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse price group id: %w", err)
	}
	var count int64
	if err := g.db.Model(&SoldTicket{}).
		Where("sold_tickets.event_id = ? AND sold_tickets.price_group_id = ?", eventIDInt, priceGroupIDInt).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return uint32(count), nil
}

// CountActiveTicketHolds implements zeni.DB.
func (g *gormZenaoDB) CountActiveTicketHolds(eventID string, priceGroupID string, nowUnix int64) (uint32, error) {
	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse event id: %w", err)
	}
	priceGroupIDInt, err := strconv.ParseUint(priceGroupID, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse price group id: %w", err)
	}
	var total int64
	row := g.db.Model(&TicketHold{}).
		Select("COALESCE(SUM(quantity), 0)").
		Where("event_id = ? AND price_group_id = ? AND expires_at > ?", eventIDInt, priceGroupIDInt, nowUnix).
		Row()
	if err := row.Scan(&total); err != nil {
		return 0, err
	}
	return uint32(total), nil
}

// ListOrderAttendeeTicketIDs implements zeni.DB.
func (g *gormZenaoDB) ListOrderAttendeeTicketIDs(orderID string) ([]string, error) {
	g, span := g.trace("gzdb.ListOrderAttendeeTicketIDs")
	defer span.End()

	var orderAttendeeID []string
	if err := g.db.Model(&SoldTicket{}).
		Select("order_attendee_id").
		Where("order_id = ? AND order_attendee_id IS NOT NULL AND order_attendee_id != ''", orderID).
		Pluck("order_attendee_id", &orderAttendeeID).Error; err != nil {
		return nil, err
	}

	return orderAttendeeID, nil
}

// CreateSoldTickets implements zeni.DB.
func (g *gormZenaoDB) CreateSoldTickets(tickets []*zeni.SoldTicket) error {
	if len(tickets) == 0 {
		return nil
	}

	for _, ticket := range tickets {
		if ticket == nil {
			return errors.New("sold ticket is nil")
		}
		if ticket.Ticket == nil {
			return errors.New("ticket data is required")
		}
		if strings.TrimSpace(ticket.OrderAttendeeID) == "" {
			return errors.New("order attendee id is required")
		}

		var priceIDInt *uint
		if strings.TrimSpace(ticket.PriceID) != "" {
			parsed, err := strconv.ParseUint(ticket.PriceID, 10, 64)
			if err != nil {
				return fmt.Errorf("parse price id: %w", err)
			}
			val := uint(parsed)
			priceIDInt = &val
		}

		var priceGroupIDInt *uint
		if strings.TrimSpace(ticket.PriceGroupID) != "" {
			parsed, err := strconv.ParseUint(ticket.PriceGroupID, 10, 64)
			if err != nil {
				return fmt.Errorf("parse price group id: %w", err)
			}
			val := uint(parsed)
			priceGroupIDInt = &val
		}

		orderID := strings.TrimSpace(ticket.OrderID)
		if orderID == "" {
			return errors.New("order id is required")
		}

		orderAttendeeID := strings.TrimSpace(ticket.OrderAttendeeID)
		secret := ticket.Ticket.Secret()
		pubkey := ticket.Ticket.Pubkey()
		if secret == "" || pubkey == "" {
			return errors.New("ticket secret and pubkey are required")
		}

		currencyCode := strings.TrimSpace(ticket.CurrencyCode)
		amountMinor := ticket.AmountMinor
		var amountMinorPtr *int64
		if amountMinor != 0 || currencyCode != "" {
			amountMinorPtr = &amountMinor
		}

		if err := g.participate(
			ticket.EventID,
			ticket.BuyerID,
			ticket.UserID,
			secret,
			"",
			false,
			&orderID,
			priceIDInt,
			priceGroupIDInt,
			&orderAttendeeID,
			currencyCode,
			amountMinorPtr,
		); err != nil {
			return err
		}
	}

	return nil
}
