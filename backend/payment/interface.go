package payment

import (
	"context"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
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

type Payment interface {
	PlatformType() string
	CreateCheckoutSession(ctx context.Context, input CheckoutSessionInput) (*CheckoutSession, error)
	CheckPaymentStatus(orderID string) (zeni.OrderStatus, error)
	DefaultHoldTTL() time.Duration
}
