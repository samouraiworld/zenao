package gzdb

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
)

type Order struct {
	ID               uint   `gorm:"primaryKey"`
	CreatedAt        int64  `gorm:"not null"`
	EventID          uint   `gorm:"index;not null"`
	BuyerID          uint   `gorm:"index;not null"`
	CurrencyCode     string `gorm:"not null"`
	AmountMinor      int64  `gorm:"not null"`
	Status           string `gorm:"not null"`
	PaymentProvider  string
	PaymentAccountID uint `gorm:"index;not null"`
	PaymentSessionID string
	PaymentIntentID  string
	ConfirmedAt      *int64
	InvoiceID        string
	InvoiceURL       string
	Event            *Event          `gorm:"foreignKey:EventID"`
	PaymentAccount   *PaymentAccount `gorm:"foreignKey:PaymentAccountID"`
}

type OrderAttendee struct {
	ID           uint        `gorm:"primaryKey"`
	CreatedAt    int64       `gorm:"not null"`
	OrderID      uint        `gorm:"index;not null"`
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
	OrderID      uint        `gorm:"index;not null"`
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
		CreatedAt:        dbOrder.CreatedAt,
		ID:               fmt.Sprintf("%d", dbOrder.ID),
		EventID:          fmt.Sprintf("%d", dbOrder.EventID),
		BuyerID:          fmt.Sprintf("%d", dbOrder.BuyerID),
		CurrencyCode:     dbOrder.CurrencyCode,
		AmountMinor:      dbOrder.AmountMinor,
		Status:           zeni.OrderStatus(dbOrder.Status),
		PaymentProvider:  dbOrder.PaymentProvider,
		PaymentAccountID: fmt.Sprintf("%d", dbOrder.PaymentAccountID),
		PaymentSessionID: dbOrder.PaymentSessionID,
		PaymentIntentID:  dbOrder.PaymentIntentID,
		ConfirmedAt:      dbOrder.ConfirmedAt,
		InvoiceID:        dbOrder.InvoiceID,
		InvoiceURL:       dbOrder.InvoiceURL,
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

	buyerIDInt, err := strconv.ParseUint(order.BuyerID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse buyer id: %w", err)
	}

	paymentAccountIDInt, err := strconv.ParseUint(order.PaymentAccountID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse payment account id: %w", err)
	}

	dbOrder := &Order{
		CreatedAt:        createdAt,
		EventID:          uint(eventIDInt),
		BuyerID:          uint(buyerIDInt),
		CurrencyCode:     order.CurrencyCode,
		AmountMinor:      order.AmountMinor,
		Status:           string(status),
		PaymentProvider:  order.PaymentProvider,
		PaymentAccountID: uint(paymentAccountIDInt),
		PaymentSessionID: order.PaymentSessionID,
		PaymentIntentID:  order.PaymentIntentID,
		ConfirmedAt:      order.ConfirmedAt,
		InvoiceID:        order.InvoiceID,
		InvoiceURL:       order.InvoiceURL,
	}
	if err := g.db.Create(dbOrder).Error; err != nil {
		return nil, err
	}

	if err := g.createOrderAttendees(dbOrder.ID, attendees); err != nil {
		return nil, err
	}

	return dbOrderToZeniOrder(dbOrder), nil
}

func (g *gormZenaoDB) createOrderAttendees(orderID uint, attendees []*zeni.OrderAttendee) error {
	if len(attendees) == 0 {
		return nil
	}
	dbAttendees := make([]OrderAttendee, 0, len(attendees))
	for _, attendee := range attendees {
		if attendee == nil {
			return errors.New("order attendee is nil")
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

// UpdateOrderPaymentSession implements zeni.DB.
func (g *gormZenaoDB) UpdateOrderSetPaymentSession(orderID string, provider string, sessionID string) error {
	orderIDInt, err := strconv.ParseUint(orderID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse order id: %w", err)
	}
	res := g.db.Model(&Order{}).Where("id = ?", orderIDInt).Updates(map[string]any{
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

// UpdateOrderStatus implements zeni.DB.
func (g *gormZenaoDB) UpdateOrderSetStatus(orderID string, status zeni.OrderStatus) error {
	orderIDInt, err := strconv.ParseUint(orderID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse order id: %w", err)
	}
	res := g.db.Model(&Order{}).Where("id = ?", orderIDInt).Update("status", status)
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
	orderIDInt, err := strconv.ParseUint(hold.OrderID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse order id: %w", err)
	}
	createdAt := hold.CreatedAt
	if createdAt == 0 {
		createdAt = time.Now().Unix()
	}
	dbHold := &TicketHold{
		CreatedAt:    createdAt,
		EventID:      uint(eventIDInt),
		PriceGroupID: uint(priceGroupIDInt),
		OrderID:      uint(orderIDInt),
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
		OrderID:      fmt.Sprintf("%d", dbHold.OrderID),
		Quantity:     dbHold.Quantity,
		ExpiresAt:    dbHold.ExpiresAt,
	}, nil
}

// DeleteTicketHoldsByOrderID implements zeni.DB.
func (g *gormZenaoDB) DeleteTicketHoldsByOrderID(orderID string) error {
	orderIDInt, err := strconv.ParseUint(orderID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse order id: %w", err)
	}
	return g.db.Where("order_id = ?", orderIDInt).Delete(&TicketHold{}).Error
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
