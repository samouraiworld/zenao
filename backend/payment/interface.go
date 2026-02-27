package payment

import (
	"context"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
)

type PaymentStatus string

const (
	PaymentStatusUnknown           PaymentStatus = "unknown"
	PaymentStatusPaid              PaymentStatus = "paid"
	PaymentStatusNoPaymentRequired PaymentStatus = "no_payment_required"
	PaymentStatusUnpaid            PaymentStatus = "unpaid"
	PaymentStatusFailed            PaymentStatus = "failed"
)

type LineItem struct {
	Quantity    uint32
	AmountMinor int64
}

type CheckoutSessionInput struct {
	EventTitle        string
	OrderID           string
	CustomerEmail     string
	Currency          string
	Now               int64
	LineItems         []LineItem
	SuccessURL        string
	CancelURL         string
	ProviderAccountID string
}

type CheckoutSession struct {
	ID  string
	URL string
}

type CheckoutSessionStatus struct {
	PaymentStatus   PaymentStatus
	PaymentIntentID string
}

type CheckoutSessionFetcher interface {
	GetCheckoutSession(ctx context.Context, sessionID string, accountID string) (*CheckoutSessionStatus, error)
}

type Payment interface {
	PlatformType() string
	CreateCheckoutSession(ctx context.Context, input CheckoutSessionInput) (*CheckoutSession, error)
	CheckPaymentStatus(orderID string) (zeni.OrderStatus, error)
	DefaultHoldTTL() time.Duration
}
